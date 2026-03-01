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

type SignupRequest struct {
	Email    string `json:"email"    binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email"    binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AuthSessionResponse struct {
	Authenticated bool   `json:"authenticated"`
	UserID        uint64 `json:"user_id"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token"        binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

// Signup godoc
// @Summary Register a new account
// @Description Creates a new user account and sends a verification email.
// @Tags auth
// @Accept json
// @Produce json
// @Param body body SignupRequest true "Email and password"
// @Success 201 {object} map[string]string
// @Failure 400 {object} utils.ErrorResponse
// @Failure 409 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /auth/signup [post]
func (ctrl *AuthController) Signup(c *gin.Context) {
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	if err := ctrl.Service.Signup(req.Email, req.Password); err != nil {
		respondWithServiceError(c, err)
		return
	}

	utils.RespondWithSuccess(c, http.StatusCreated, gin.H{"message": "Account created. Please check your email to verify your address."})
}

// Login godoc
// @Summary Sign in to an existing account
// @Description Authenticates a verified user and sets a session cookie.
// @Tags auth
// @Accept json
// @Produce json
// @Param body body LoginRequest true "Email and password"
// @Success 200 {object} map[string]string
// @Failure 400 {object} utils.ErrorResponse
// @Failure 401 {object} utils.ErrorResponse
// @Failure 403 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /auth/login [post]
func (ctrl *AuthController) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	token, err := ctrl.Service.Login(req.Email, req.Password)
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

// VerifyEmail godoc
// @Summary Verify email address
// @Description Verifies a user's email address using the token sent via email.
// @Tags auth
// @Produce json
// @Param token query string true "Verification token"
// @Success 200 {object} map[string]string
// @Failure 404 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /auth/verify-email [get]
func (ctrl *AuthController) VerifyEmail(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		utils.RespondWithError(c, http.StatusBadRequest, "VALIDATION_ERROR", "token is required")
		return
	}

	if err := ctrl.Service.VerifyEmail(token); err != nil {
		respondWithServiceError(c, err)
		return
	}

	utils.RespondWithSuccess(c, http.StatusOK, gin.H{"message": "Email verified successfully. You can now sign in."})
}

// Me godoc
// @Summary Get current user
// @Description Returns the authenticated user's ID.
// @Tags auth
// @Accept json
// @Produce json
// @Success 200 {object} AuthSessionResponse
// @Failure 401 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /auth/me [get]
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

// Logout godoc
// @Summary Logout
// @Description Clears the authentication cookie.
// @Tags auth
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 500 {object} utils.ErrorResponse
// @Router /auth/logout [post]
func (ctrl *AuthController) Logout(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("nexia_token", "", -1, "/", "", false, true)
	utils.RespondWithSuccess(c, http.StatusOK, gin.H{"message": "Logged out"})
}

// ForgotPassword godoc
// @Summary Request password reset
// @Description Sends a password reset email if the account exists. Always returns success to prevent enumeration.
// @Tags auth
// @Accept json
// @Produce json
// @Param body body ForgotPasswordRequest true "Email address"
// @Success 200 {object} map[string]string
// @Failure 400 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /auth/forgot-password [post]
func (ctrl *AuthController) ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	if err := ctrl.Service.ForgotPassword(req.Email); err != nil {
		respondWithServiceError(c, err)
		return
	}

	utils.RespondWithSuccess(c, http.StatusOK, gin.H{"message": "If that email is registered, you'll receive reset instructions shortly."})
}

// ResetPassword godoc
// @Summary Reset password using a reset token
// @Description Validates the reset token and updates the user's password. Tokens are single-use and expire after 15 minutes.
// @Tags auth
// @Accept json
// @Produce json
// @Param body body ResetPasswordRequest true "Reset token and new password"
// @Success 200 {object} map[string]string
// @Failure 400 {object} utils.ErrorResponse
// @Failure 404 {object} utils.ErrorResponse
// @Failure 500 {object} utils.ErrorResponse
// @Router /auth/reset-password [post]
func (ctrl *AuthController) ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondWithError(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	if err := ctrl.Service.ResetPassword(req.Token, req.NewPassword); err != nil {
		respondWithServiceError(c, err)
		return
	}

	utils.RespondWithSuccess(c, http.StatusOK, gin.H{"message": "Password updated successfully"})
}
