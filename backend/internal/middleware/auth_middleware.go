package middleware

import (
	"net/http"
	"strings"

	"nexia-backend/internal/config"
	"nexia-backend/internal/models"
	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// UserLookup is the minimal interface AuthMiddleware needs to verify a user exists in the database.
type UserLookup interface {
	FindByID(id uint64) (*models.User, error)
}

// AuthMiddleware validates the JWT from either the Authorization: Bearer header or
// the nexia_token cookie, then verifies the user still exists in the database.
// On success it stores the userID in the Gin context and records the auth method
// (bearer or cookie) for downstream CSRF enforcement.
func AuthMiddleware(cfg *config.Config, users UserLookup) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		tokenString := ""

		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid authorization header format")
				c.Abort()
				return
			}
			tokenString = parts[1]
			c.Set(authMethodKey, authMethodBearer)
		} else {
			cookieToken, err := c.Cookie("nexia_token")
			if err != nil || cookieToken == "" {
				utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authorization token required")
				c.Abort()
				return
			}
			tokenString = cookieToken
			c.Set(authMethodKey, authMethodCookie)
		}

		claims, err := utils.ValidateToken(tokenString, cfg)
		if err != nil {
			utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid or expired token")
			c.Abort()
			return
		}

		if _, err := users.FindByID(claims.UserID); err != nil {
			utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not found")
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Next()
	}
}
