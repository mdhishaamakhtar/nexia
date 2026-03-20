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

// AuthController handles authentication endpoints: signup, login, logout,
// email verification, and password reset.
type AuthController struct {
	Service *services.AuthService
	Config  *config.Config
}

// NewAuthController constructs an AuthController.
func NewAuthController(service *services.AuthService, cfg *config.Config) *AuthController {
	return &AuthController{Service: service, Config: cfg}
}

// SignupRequest is the request body for POST /auth/signup.
type SignupRequest struct {
	Email    string `json:"email"    binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginRequest is the request body for POST /auth/login.
type LoginRequest struct {
	Email    string `json:"email"    binding:"required"`
	Password string `json:"password" binding:"required"`
}

// AuthSessionResponse is returned by GET /auth/me.
type AuthSessionResponse struct {
	Authenticated bool   `json:"authenticated"`
	UserID        uint64 `json:"user_id"`
}

// ForgotPasswordRequest is the request body for POST /auth/forgot-password.
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required"`
}

// ResetPasswordRequest is the request body for POST /auth/reset-password.
type ResetPasswordRequest struct {
	Token       string `json:"token"        binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

// Signup registers a new account and sends a verification email.
// The account cannot be used until the email is verified.
//
// @Summary      Register a new account
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body SignupRequest true "Credentials"
// @Success      201  {object}  map[string]string
// @Failure      400  {object}  utils.ErrorResponse "Invalid request or password too short"
// @Failure      409  {object}  utils.ErrorResponse "Email already registered"
// @Failure      500  {object}  utils.ErrorResponse
// @Router       /auth/signup [post]
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

// Login authenticates a verified user, sets the nexia_token and nexia_csrf cookies,
// and also returns the JWT in the response body for clients that prefer header-based auth.
//
// @Summary      Sign in
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body body LoginRequest true "Credentials"
// @Success      200  {object}  map[string]string        "JWT token"
// @Failure      400  {object}  utils.ErrorResponse      "Invalid request body"
// @Failure      401  {object}  utils.ErrorResponse      "Wrong password or account not found"
// @Failure      403  {object}  utils.ErrorResponse      "Email not yet verified"
// @Failure      500  {object}  utils.ErrorResponse
// @Router       /auth/login [post]
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

	csrfToken, err := utils.GenerateCSRFToken()
	if err != nil {
		utils.RespondWithError(c, http.StatusInternalServerError, "SERVER_ERROR", "Failed to generate CSRF token")
		return
	}

	c.SetSameSite(http.SameSiteNoneMode)
	c.SetCookie("nexia_token", token, maxAgeSeconds, "/", ctrl.Config.Server.CookieDomain, true, true)
	c.SetCookie(middleware.CSRFCookieName, csrfToken, maxAgeSeconds, "/", ctrl.Config.Server.CookieDomain, true, false)

	utils.RespondWithSuccess(c, http.StatusOK, gin.H{"token": token})
}

// VerifyEmail marks a user's email as verified using the single-use token
// delivered by the signup email. Tokens expire after 24 hours.
//
// @Summary      Verify email address
// @Tags         auth
// @Produce      json
// @Param        token  query  string  true  "Single-use verification token"
// @Success      200    {object}  map[string]string
// @Failure      400    {object}  utils.ErrorResponse  "Missing token"
// @Failure      404    {object}  utils.ErrorResponse  "Token not found or already used"
// @Failure      500    {object}  utils.ErrorResponse
// @Router       /auth/verify-email [get]
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

// Me returns the authenticated user's ID. Used by the frontend to confirm
// a session is still valid after a page reload.
//
// @Summary      Get current user
// @Tags         auth
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  AuthSessionResponse
// @Failure      401  {object}  utils.ErrorResponse
// @Router       /auth/me [get]
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

// Logout clears the nexia_token and nexia_csrf cookies.
//
// @Summary      Logout
// @Tags         auth
// @Produce      json
// @Security     BearerAuth
// @Success      200  {object}  map[string]string
// @Router       /auth/logout [post]
func (ctrl *AuthController) Logout(c *gin.Context) {
	c.SetSameSite(http.SameSiteNoneMode)
	c.SetCookie("nexia_token", "", -1, "/", ctrl.Config.Server.CookieDomain, true, true)
	c.SetCookie(middleware.CSRFCookieName, "", -1, "/", ctrl.Config.Server.CookieDomain, true, false)
	utils.RespondWithSuccess(c, http.StatusOK, gin.H{"message": "Logged out"})
}

// ForgotPassword sends a password reset email if the address is registered.
// Always returns 200 to prevent email enumeration attacks.
//
// @Summary      Request password reset
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body  ForgotPasswordRequest  true  "Registered email"
// @Success      200   {object}  map[string]string
// @Failure      400   {object}  utils.ErrorResponse  "Invalid request body"
// @Failure      500   {object}  utils.ErrorResponse
// @Router       /auth/forgot-password [post]
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

// ResetPassword validates a single-use reset token and updates the user's password.
// Tokens expire after 15 minutes and are invalidated on first use.
//
// @Summary      Reset password
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body  ResetPasswordRequest  true  "Reset token and new password"
// @Success      200   {object}  map[string]string
// @Failure      400   {object}  utils.ErrorResponse  "Invalid body or password too short"
// @Failure      404   {object}  utils.ErrorResponse  "Token not found, expired, or already used"
// @Failure      500   {object}  utils.ErrorResponse
// @Router       /auth/reset-password [post]
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
