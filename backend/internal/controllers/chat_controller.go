package controllers

import (
	"net/http"

	"nexia-backend/internal/middleware"
	"nexia-backend/internal/services"
	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type ChatController struct {
	Service *services.ChatService
}

func NewChatController(service *services.ChatService) *ChatController {
	return &ChatController{Service: service}
}

type ChatRequest struct {
	Message string `json:"message" binding:"required"`
}

type ChatResponse struct {
	Response string `json:"response"`
}

// Chat godoc
// @Summary Chat with your friends' profiles
// @Description Ask questions about your friends using RAG
// @Tags chat
// @Accept json
// @Produce json
// @Param request body ChatRequest true "Chat Request"
// @Security BearerAuth
// @Success 200 {object} ChatResponse
// @Failure 400 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /chat [post]
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
