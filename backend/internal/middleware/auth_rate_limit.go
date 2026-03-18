package middleware

import (
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/ratelimit"
	"go.uber.org/zap"
)

type authRateLimiter struct {
	logger *zap.Logger
	limit  int
	per    time.Duration

	mu       sync.Mutex
	limiters map[string]*visitorLimiter
}

type visitorLimiter struct {
	limiter  ratelimit.Limiter
	lastSeen time.Time
}

func NewAuthRateLimit(logger *zap.Logger) gin.HandlerFunc {
	return newAuthRateLimit(logger, 10, 10*time.Second)
}

func newAuthRateLimit(logger *zap.Logger, limit int, per time.Duration) gin.HandlerFunc {
	if logger == nil {
		logger = zap.NewNop()
	}

	limiter := &authRateLimiter{
		logger:   logger.Named("auth_rate_limit"),
		limit:    limit,
		per:      per,
		limiters: make(map[string]*visitorLimiter),
	}

	return limiter.middleware()
}

func (l *authRateLimiter) middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.FullPath() + ":" + c.ClientIP()
		now := time.Now()

		l.mu.Lock()
		for k, entry := range l.limiters {
			if now.Sub(entry.lastSeen) > 10*l.per {
				delete(l.limiters, k)
			}
		}

		entry, ok := l.limiters[key]
		if !ok {
			entry = &visitorLimiter{
				limiter:  ratelimit.New(l.limit, ratelimit.Per(l.per), ratelimit.WithoutSlack),
				lastSeen: now,
			}
			l.limiters[key] = entry
		}
		entry.lastSeen = now
		limiter := entry.limiter
		l.mu.Unlock()

		before := time.Now()
		_ = limiter.Take()
		waited := time.Since(before)

		if waited > 0 {
			l.logger.Warn("auth rate limit delay applied",
				zap.String("path", c.FullPath()),
				zap.String("client_ip", c.ClientIP()),
				zap.Duration("waited", waited),
			)
		}

		c.Header("X-RateLimit-Limit", "10 per 10 seconds")
		c.Next()
	}
}
