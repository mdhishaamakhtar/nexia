package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

func TestAuthRateLimitDelaysBurstRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(newAuthRateLimit(zap.NewNop(), 1, 50*time.Millisecond))
	r.POST("/auth/login", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	firstReq := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
	firstReq.RemoteAddr = "127.0.0.1:1234"
	firstRes := httptest.NewRecorder()
	start := time.Now()
	r.ServeHTTP(firstRes, firstReq)
	firstElapsed := time.Since(start)

	secondReq := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
	secondReq.RemoteAddr = "127.0.0.1:1234"
	secondRes := httptest.NewRecorder()
	start = time.Now()
	r.ServeHTTP(secondRes, secondReq)
	secondElapsed := time.Since(start)

	if firstRes.Code != http.StatusOK || secondRes.Code != http.StatusOK {
		t.Fatalf("expected both requests to pass")
	}
	if secondElapsed <= firstElapsed {
		t.Fatalf("expected second request to be throttled, first=%v second=%v", firstElapsed, secondElapsed)
	}
}
