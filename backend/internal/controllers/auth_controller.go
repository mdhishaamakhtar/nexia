package controllers

import (
	"net/http"

	"nexia-backend/internal/services"
	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type AuthController struct {
	Service *services.AuthService
}

func NewAuthController(service *services.AuthService) *AuthController {
	return &AuthController{Service: service}
}

type AuthRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginOrSignup godoc
// @Summary Login or Signup
// @Description Authenticate user. If user does not exist, create one. Returns JWT.
// @Tags auth
// @Accept json
// @Produce json
// @Param credentials body AuthRequest true "Credentials"
// @Success 200 {object} map[string]string
// @Failure 400 {object} utils.ErrorResponse
// @Failure 401 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /auth [post]
func (ctrl *AuthController) LoginOrSignup(c *gin.Context) {
	var req AuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	token, err := ctrl.Service.LoginOrSignup(req.Username, req.Password)
	if err != nil {
		if err.Error() == "invalid credentials" {
			utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid credentials")
			return
		}
		utils.RespondWithError(c, http.StatusInternalServerError, "SERVER_ERROR", err.Error())
		return
	}

	utils.RespondWithSuccess(c, http.StatusOK, gin.H{"token": token})
}
