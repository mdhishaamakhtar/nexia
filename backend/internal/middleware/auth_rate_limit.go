package middleware

import (
	"time"

	"nexia-backend/internal/config"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

const (
	defaultAuthRateLimitRequests = 10
	defaultAuthRateLimitBurst    = 10
	defaultAuthRateLimitWindow   = 10 * time.Second
)

// NewAuthRateLimit returns an in-memory per-IP token-bucket limiter for auth endpoints.
// Requests that exceed the configured budget are rejected with HTTP 429.
func NewAuthRateLimit(logger *zap.Logger, cfg *config.Config) gin.HandlerFunc {
	return newRateLimit(logger, "auth", "Too many authentication requests", authRateLimitConfigFromConfig(cfg))
}

func authRateLimitConfigFromConfig(cfg *config.Config) rateLimitConfig {
	if cfg == nil {
		return rateLimitConfigFromValues(defaultAuthRateLimitRequests, defaultAuthRateLimitBurst, defaultAuthRateLimitWindow, 0, 0, 0)
	}

	return rateLimitConfigFromValues(
		defaultAuthRateLimitRequests,
		defaultAuthRateLimitBurst,
		defaultAuthRateLimitWindow,
		cfg.Server.AuthRateLimitRequests,
		cfg.Server.AuthRateLimitBurst,
		cfg.Server.AuthRateLimitWindowSeconds,
	)
}
