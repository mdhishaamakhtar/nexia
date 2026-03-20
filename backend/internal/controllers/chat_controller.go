package controllers

import (
	"net/http"

	"nexia-backend/internal/middleware"
	"nexia-backend/internal/services"
	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// ChatController handles AI chat requests.
type ChatController struct {
	Service *services.ChatService
}

// NewChatController constructs a ChatController.
func NewChatController(service *services.ChatService) *ChatController {
	return &ChatController{Service: service}
}

// ChatRequest is the request body for POST /chat.
type ChatRequest struct {
	Message string `json:"message" binding:"required"`
}

// ChatResponse is returned by POST /chat.
type ChatResponse struct {
	Response string `json:"response"`
}

// Chat answers a natural-language question about the user's contacts using RAG.
// Returns 503 when Gemini or Redis are not configured.
//
// @Summary      Chat with Nexia Intel
// @Tags         chat
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        request  body      ChatRequest          true  "User question"
// @Success      200      {object}  ChatResponse
// @Failure      400      {object}  utils.ErrorResponse  "Missing message"
// @Failure      401      {object}  utils.ErrorResponse
// @Failure      503      {object}  utils.ErrorResponse  "AI service not configured"
// @Failure      500      {object}  utils.ErrorResponse
// @Router       /chat [post]
func (ctrl *ChatController) Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	uid, err := middleware.GetUserID(c)
	if err != nil {
		utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User ID not found in context")
		return
	}

	response, err := ctrl.Service.Chat(c.Request.Context(), uid, req.Message)
	if err != nil {
		respondWithServiceError(c, err)
		return
	}

	utils.RespondWithSuccess(c, http.StatusOK, ChatResponse{Response: response})
}
