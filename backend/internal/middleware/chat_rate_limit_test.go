package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"nexia-backend/internal/config"

	"github.com/stretchr/testify/require"
)

func TestChatRateLimitRejectsRequestsBeyondBurst(t *testing.T) {
	r := newRateLimitTestRouter(t, "/chat", "chat", "Too many chat requests", rateLimitConfig{
		requests: 1,
		burst:    1,
		window:   time.Minute,
	})

	first := httptest.NewRecorder()
	req1 := httptest.NewRequest(http.MethodPost, "/chat", nil)
	req1.RemoteAddr = "127.0.0.1:1234"
	r.ServeHTTP(first, req1)
	require.Equal(t, http.StatusOK, first.Code)

	second := httptest.NewRecorder()
	req2 := httptest.NewRequest(http.MethodPost, "/chat", nil)
	req2.RemoteAddr = "127.0.0.1:1234"
	r.ServeHTTP(second, req2)

	requireRateLimited(t, second, "1 requests per 1m0s (burst 1)", "60", "Too many chat requests")
}

func TestChatRateLimitConfigUsesDefaultsAndClampsBurst(t *testing.T) {
	defaults := chatRateLimitConfigFromConfig(nil)
	require.Equal(t, rateLimitConfig{
		requests: defaultChatRateLimitRequests,
		burst:    defaultChatRateLimitBurst,
		window:   defaultChatRateLimitWindow,
	}, defaults)

	cfg := &config.Config{
		Server: config.ServerConfig{
			ChatRateLimitRequests:      4,
			ChatRateLimitWindowSeconds: 90,
			ChatRateLimitBurst:         99,
		},
	}

	require.Equal(t, rateLimitConfig{
		requests: 4,
		burst:    4,
		window:   90 * time.Second,
	}, chatRateLimitConfigFromConfig(cfg))
}
