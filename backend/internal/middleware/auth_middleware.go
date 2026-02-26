package middleware

import (
	"net/http"
	"strings"

	"nexia-backend/internal/config"
	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
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
		} else {
			cookieToken, err := c.Cookie("nexia_token")
			if err != nil || cookieToken == "" {
				utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authorization token required")
				c.Abort()
				return
			}
			tokenString = cookieToken
		}

		claims, err := utils.ValidateToken(tokenString, cfg)
		if err != nil {
			utils.RespondWithError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid or expired token")
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Next()
	}
}
