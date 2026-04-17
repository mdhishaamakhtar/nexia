package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func newRateLimitTestRouter(t *testing.T, path string, name string, message string, cfg rateLimitConfig) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(newRateLimit(zap.NewNop(), name, message, cfg))
	r.POST(path, func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	return r
}

func requireRateLimited(t *testing.T, rec *httptest.ResponseRecorder, limit string, retryAfter string, message string) {
	t.Helper()
	require.Equal(t, http.StatusTooManyRequests, rec.Code)
	require.Equal(t, limit, rec.Header().Get("X-RateLimit-Limit"))
	require.Equal(t, retryAfter, rec.Header().Get("Retry-After"))

	var body utils.ErrorResponse
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	require.Equal(t, "RATE_LIMITED", body.Error.Code)
	require.Equal(t, message, body.Error.Message)
}

func TestRateLimitPanicsWithNilLogger(t *testing.T) {
	require.Panics(t, func() {
		newRateLimit(nil, "auth", "Too many authentication requests", rateLimitConfig{
			requests: 1,
			burst:    1,
			window:   time.Second,
		})
	})
}
