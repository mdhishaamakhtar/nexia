package middleware

import (
	"fmt"
	"math"
	"net/http"
	"sync"
	"time"

	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
)

const rateLimiterStaleEntryTTLFactor = 10

type rateLimitConfig struct {
	requests int
	burst    int
	window   time.Duration
}

type inMemoryRateLimiter struct {
	logger   *zap.Logger
	name     string
	message  string
	requests int
	burst    int
	window   time.Duration

	mu       sync.Mutex
	limiters map[string]*visitorLimiter
}

type visitorLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

func newRateLimit(logger *zap.Logger, name string, message string, cfg rateLimitConfig) gin.HandlerFunc {
	if logger == nil {
		panic(name + " rate limit requires a logger")
	}

	limiter := &inMemoryRateLimiter{
		logger:   logger.Named(name + "_rate_limit"),
		name:     name,
		message:  message,
		requests: cfg.requests,
		burst:    cfg.burst,
		window:   cfg.window,
		limiters: make(map[string]*visitorLimiter),
	}

	return limiter.middleware()
}

func rateLimitConfigFromValues(
	defaultRequests int,
	defaultBurst int,
	defaultWindow time.Duration,
	requests int,
	burst int,
	windowSeconds int,
) rateLimitConfig {
	cfg := rateLimitConfig{
		requests: defaultRequests,
		burst:    defaultBurst,
		window:   defaultWindow,
	}

	if requests > 0 {
		cfg.requests = requests
	}
	if burst > 0 {
		cfg.burst = burst
	}
	if windowSeconds > 0 {
		cfg.window = time.Duration(windowSeconds) * time.Second
	}
	if cfg.burst > cfg.requests {
		cfg.burst = cfg.requests
	}

	return cfg
}

func (l *inMemoryRateLimiter) description() string {
	return fmt.Sprintf("%d requests per %s (burst %d)", l.requests, l.window, l.burst)
}

func (l *inMemoryRateLimiter) middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.FullPath() + ":" + c.ClientIP()
		now := time.Now()

		l.mu.Lock()
		for k, entry := range l.limiters {
			if now.Sub(entry.lastSeen) > rateLimiterStaleEntryTTLFactor*l.window {
				delete(l.limiters, k)
			}
		}

		entry, ok := l.limiters[key]
		if !ok {
			entry = &visitorLimiter{
				limiter:  rate.NewLimiter(rate.Limit(float64(l.requests)/l.window.Seconds()), l.burst),
				lastSeen: now,
			}
			l.limiters[key] = entry
		}
		entry.lastSeen = now
		limiter := entry.limiter
		l.mu.Unlock()

		reservation := limiter.ReserveN(now, 1)
		if !reservation.OK() {
			utils.RespondWithError(c, http.StatusTooManyRequests, "RATE_LIMITED", l.message)
			c.Abort()
			return
		}

		delay := reservation.DelayFrom(now)
		if delay > 0 {
			reservation.CancelAt(now)
			retryAfter := max(1, int(math.Ceil(delay.Seconds())))
			c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
			l.logger.Warn(l.name+" rate limit exceeded",
				zap.String("path", c.FullPath()),
				zap.String("client_ip", c.ClientIP()),
				zap.Duration("retry_after", delay),
			)
			c.Header("X-RateLimit-Limit", l.description())
			utils.RespondWithError(c, http.StatusTooManyRequests, "RATE_LIMITED", l.message)
			c.Abort()
			return
		}

		c.Header("X-RateLimit-Limit", l.description())
		c.Next()
	}
}
