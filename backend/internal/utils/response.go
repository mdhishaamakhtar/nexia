package utils

import (
	"github.com/gin-gonic/gin"
)

// ErrorResponse is the standard error envelope returned by all API endpoints.
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail carries a machine-readable code and a human-readable message.
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// RespondWithError writes a JSON error response with the given HTTP status, error code, and message.
func RespondWithError(c *gin.Context, status int, code string, message string) {
	c.JSON(status, ErrorResponse{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
	})
}

// RespondWithSuccess writes a JSON success response with the given HTTP status and data payload.
func RespondWithSuccess(c *gin.Context, status int, data any) {
	c.JSON(status, data)
}
