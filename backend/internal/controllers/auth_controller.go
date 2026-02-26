package controllers

import (
	"net/http"
	"time"

	"nexia-backend/internal/config"
	"nexia-backend/internal/middleware"
	"nexia-backend/internal/services"
	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type AuthController struct {
	Service *services.AuthService
	Config  *config.Config
}

func NewAuthController(service *services.AuthService, cfg *config.Config) *AuthController {
	return &AuthController{Service: service, Config: cfg}
}

type AuthRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthSessionResponse struct {
	Authenticated bool   `json:"authenticated"`
	UserID        uint64 `json:"user_id"`
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
		respondWithServiceError(c, err)
		return
	}

	maxAgeSeconds := ctrl.Config.Server.JWTExpiryMinutes * 60
	if maxAgeSeconds <= 0 {
		maxAgeSeconds = int((24 * time.Hour).Seconds())
	}

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("nexia_token", token, maxAgeSeconds, "/", "", false, true)

	utils.RespondWithSuccess(c, http.StatusOK, gin.H{"token": token})
}

func (ctrl *AuthController) Me(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User ID not found in context")
		return
	}

	utils.RespondWithSuccess(c, http.StatusOK, AuthSessionResponse{
		Authenticated: true,
		UserID:        userID,
	})
}

func (ctrl *AuthController) Logout(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("nexia_token", "", -1, "/", "", false, true)
	utils.RespondWithSuccess(c, http.StatusOK, gin.H{"message": "Logged out"})
}
