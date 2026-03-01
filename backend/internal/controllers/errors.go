package controllers

import (
	"errors"
	"net/http"

	"nexia-backend/internal/services"
	"nexia-backend/internal/utils"

	"gorm.io/gorm"

	"github.com/gin-gonic/gin"
)

func respondWithServiceError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrAccountNotFound):
		utils.RespondWithError(c, http.StatusUnauthorized, "ACCOUNT_NOT_FOUND", "No account found with that email")
	case errors.Is(err, services.ErrUnauthorized):
		utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid credentials")
	case errors.Is(err, services.ErrValidation):
		utils.RespondWithError(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
	case errors.Is(err, services.ErrNotFound), errors.Is(err, gorm.ErrRecordNotFound):
		utils.RespondWithError(c, http.StatusNotFound, "NOT_FOUND", "Resource not found")
	case errors.Is(err, services.ErrAIUnavailable):
		utils.RespondWithError(c, http.StatusServiceUnavailable, "AI_UNAVAILABLE", "AI service unavailable")
	case errors.Is(err, services.ErrEmailNotVerified):
		utils.RespondWithError(c, http.StatusForbidden, "EMAIL_NOT_VERIFIED", "Please verify your email before signing in")
	case errors.Is(err, services.ErrEmailConflict):
		utils.RespondWithError(c, http.StatusConflict, "EMAIL_CONFLICT", "An account with that email already exists")
	default:
		utils.RespondWithError(c, http.StatusInternalServerError, "SERVER_ERROR", err.Error())
	}
}
