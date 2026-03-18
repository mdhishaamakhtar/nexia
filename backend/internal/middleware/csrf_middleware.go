package middleware

import (
	"crypto/subtle"
	"net/http"

	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

const (
	CSRFCookieName   = "nexia_csrf"
	CSRFHeaderName   = "X-CSRF-Token"
	authMethodKey    = "authMethod"
	authMethodCookie = "cookie"
	authMethodBearer = "bearer"
)

func CSRFMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		switch c.Request.Method {
		case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		default:
			c.Next()
			return
		}

		authMethod, _ := c.Get(authMethodKey)
		if authMethod != authMethodCookie {
			c.Next()
			return
		}

		cookieToken, err := c.Cookie(CSRFCookieName)
		if err != nil || cookieToken == "" {
			utils.RespondWithError(c, http.StatusForbidden, "CSRF_TOKEN_MISSING", "CSRF token required")
			c.Abort()
			return
		}

		headerToken := c.GetHeader(CSRFHeaderName)
		if headerToken == "" {
			utils.RespondWithError(c, http.StatusForbidden, "CSRF_TOKEN_MISSING", "CSRF token required")
			c.Abort()
			return
		}

		if subtle.ConstantTimeCompare([]byte(cookieToken), []byte(headerToken)) != 1 {
			utils.RespondWithError(c, http.StatusForbidden, "CSRF_TOKEN_INVALID", "Invalid CSRF token")
			c.Abort()
			return
		}

		c.Next()
	}
}
