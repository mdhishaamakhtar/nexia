package middleware

import (
	"time"

	"nexia-backend/internal/config"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

const (
	defaultChatRateLimitRequests = 10
	defaultChatRateLimitBurst    = 3
	defaultChatRateLimitWindow   = time.Minute
)

// NewChatRateLimit returns an in-memory per-IP token-bucket limiter for chat endpoints.
// Requests that exceed the configured budget are rejected with HTTP 429.
func NewChatRateLimit(logger *zap.Logger, cfg *config.Config) gin.HandlerFunc {
	return newRateLimit(logger, "chat", "Too many chat requests", chatRateLimitConfigFromConfig(cfg))
}

func chatRateLimitConfigFromConfig(cfg *config.Config) rateLimitConfig {
	if cfg == nil {
		return rateLimitConfigFromValues(defaultChatRateLimitRequests, defaultChatRateLimitBurst, defaultChatRateLimitWindow, 0, 0, 0)
	}

	return rateLimitConfigFromValues(
		defaultChatRateLimitRequests,
		defaultChatRateLimitBurst,
		defaultChatRateLimitWindow,
		cfg.Server.ChatRateLimitRequests,
		cfg.Server.ChatRateLimitBurst,
		cfg.Server.ChatRateLimitWindowSeconds,
	)
}
