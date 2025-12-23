package controllers

import (
	"net/http"

	"nexia-backend/internal/services"

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
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /chat [post]
func (ctrl *ChatController) Chat(c *gin.Context) {
	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	uid, ok := userID.(uint64)
	if !ok {
		// Handle case where it might be float64 or int (depends on how it was set/decoded)
		if fuid, ok := userID.(float64); ok {
			uid = uint64(fuid)
		} else if iuid, ok := userID.(int); ok {
			uid = uint64(iuid)
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid User ID type"})
			return
		}
	}

	response, err := ctrl.Service.Chat(c.Request.Context(), uid, req.Message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, ChatResponse{Response: response})
}
