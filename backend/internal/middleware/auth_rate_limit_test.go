package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"nexia-backend/internal/config"

	"github.com/stretchr/testify/require"
)

func TestAuthRateLimitRejectsRequestsBeyondBurst(t *testing.T) {
	r := newRateLimitTestRouter(t, "/auth/login", "auth", "Too many authentication requests", rateLimitConfig{
		requests: 2,
		burst:    2,
		window:   time.Minute,
	})

	for i := 0; i < 2; i++ {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.RemoteAddr = "127.0.0.1:1234"
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		require.Equal(t, http.StatusOK, rec.Code, "request %d", i)
		require.Equal(t, "2 requests per 1m0s (burst 2)", rec.Header().Get("X-RateLimit-Limit"))
	}

	req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
	req.RemoteAddr = "127.0.0.1:1234"
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	requireRateLimited(t, rec, "2 requests per 1m0s (burst 2)", "30", "Too many authentication requests")
}

func TestAuthRateLimitPartitionsByClientIP(t *testing.T) {
	r := newRateLimitTestRouter(t, "/auth/login", "auth", "Too many authentication requests", rateLimitConfig{
		requests: 1,
		burst:    1,
		window:   time.Minute,
	})

	reqA := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
	reqA.RemoteAddr = "10.0.0.1:1111"
	recA1 := httptest.NewRecorder()
	r.ServeHTTP(recA1, reqA)
	require.Equal(t, http.StatusOK, recA1.Code)

	reqAAgain := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
	reqAAgain.RemoteAddr = "10.0.0.1:1111"
	recA2 := httptest.NewRecorder()
	r.ServeHTTP(recA2, reqAAgain)
	require.Equal(t, http.StatusTooManyRequests, recA2.Code)

	reqB := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
	reqB.RemoteAddr = "10.0.0.2:2222"
	recB := httptest.NewRecorder()
	r.ServeHTTP(recB, reqB)
	require.Equal(t, http.StatusOK, recB.Code)
}

func TestAuthRateLimitConfigUsesDefaultsAndClampsBurst(t *testing.T) {
	defaults := authRateLimitConfigFromConfig(nil)
	require.Equal(t, rateLimitConfig{
		requests: defaultAuthRateLimitRequests,
		burst:    defaultAuthRateLimitBurst,
		window:   defaultAuthRateLimitWindow,
	}, defaults)

	cfg := &config.Config{
		Server: config.ServerConfig{
			AuthRateLimitRequests:      5,
			AuthRateLimitWindowSeconds: 30,
			AuthRateLimitBurst:         99,
		},
	}

	require.Equal(t, rateLimitConfig{
		requests: 5,
		burst:    5,
		window:   30 * time.Second,
	}, authRateLimitConfigFromConfig(cfg))
}

func TestAuthRateLimitConfigIgnoresNonPositiveOverrides(t *testing.T) {
	cfg := &config.Config{
		Server: config.ServerConfig{
			AuthRateLimitRequests:      -1,
			AuthRateLimitWindowSeconds: 0,
			AuthRateLimitBurst:         -2,
		},
	}

	require.Equal(t, rateLimitConfig{
		requests: defaultAuthRateLimitRequests,
		burst:    defaultAuthRateLimitBurst,
		window:   defaultAuthRateLimitWindow,
	}, authRateLimitConfigFromConfig(cfg))
}
