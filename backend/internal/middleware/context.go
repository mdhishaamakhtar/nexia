package middleware

import (
	"errors"

	"github.com/gin-gonic/gin"
)

// ErrUserIDNotFound is returned by GetUserID when the userID key is absent or
// has an unexpected type in the Gin context.
var ErrUserIDNotFound = errors.New("user id not found in context")

// GetUserID extracts the authenticated user's ID from the Gin context.
// The value is set by AuthMiddleware after successful JWT validation.
func GetUserID(c *gin.Context) (uint64, error) {
	userID, exists := c.Get("userID")
	if !exists {
		return 0, ErrUserIDNotFound
	}

	uid, ok := userID.(uint64)
	if !ok {
		return 0, ErrUserIDNotFound
	}

	return uid, nil
}
