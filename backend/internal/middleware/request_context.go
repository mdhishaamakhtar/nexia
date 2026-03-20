package middleware

import (
	"net/http"
	"runtime/debug"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

const requestIDKey = "requestID"

// RequestContext assigns a request ID (from X-Request-ID header or a fresh UUID),
// echoes it back in the response header, and logs a structured access-log entry
// after the request completes. Log level is keyed on the response status code.
func RequestContext(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.NewString()
		}

		c.Set(requestIDKey, requestID)
		c.Header("X-Request-ID", requestID)

		start := time.Now()
		c.Next()

		fields := []zap.Field{
			zap.String("request_id", requestID),
			zap.String("method", c.Request.Method),
			zap.String("path", c.FullPath()),
			zap.String("raw_path", c.Request.URL.Path),
			zap.Int("status_code", c.Writer.Status()),
			zap.Duration("duration", time.Since(start)),
			zap.String("client_ip", c.ClientIP()),
			zap.String("user_agent", c.Request.UserAgent()),
			zap.Int("response_bytes", c.Writer.Size()),
		}

		if userID, ok := c.Get("userID"); ok {
			fields = append(fields, zap.Any("user_id", userID))
		}

		if len(c.Errors) > 0 {
			fields = append(fields, zap.String("errors", c.Errors.String()))
		}

		switch {
		case c.Writer.Status() >= http.StatusInternalServerError:
			logger.Error("request completed", fields...)
		case c.Writer.Status() >= http.StatusBadRequest:
			logger.Warn("request completed", fields...)
		default:
			logger.Info("request completed", fields...)
		}
	}
}

// Recovery catches panics in downstream handlers, logs a full stack trace, and
// returns a 500 JSON error response so the server stays alive.
func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if recovered := recover(); recovered != nil {
				logger.Error("panic recovered",
					zap.String("request_id", GetRequestID(c)),
					zap.Any("panic", recovered),
					zap.ByteString("stack", debug.Stack()),
					zap.String("method", c.Request.Method),
					zap.String("path", c.Request.URL.Path),
				)
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error": gin.H{
						"code":    "SERVER_ERROR",
						"message": "Internal server error",
					},
				})
			}
		}()

		c.Next()
	}
}

// GetRequestID retrieves the request ID stored by RequestContext middleware.
// Returns an empty string if the middleware was not applied.
func GetRequestID(c *gin.Context) string {
	if v, ok := c.Get(requestIDKey); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
