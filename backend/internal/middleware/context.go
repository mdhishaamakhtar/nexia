package middleware

import (
	"errors"

	"github.com/gin-gonic/gin"
)

var ErrUserIDNotFound = errors.New("user id not found in context")

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
