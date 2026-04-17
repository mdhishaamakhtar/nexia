package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// TestAuthRateLimitDelaysBurstRequests sends N requests at rate 1/per and
// asserts the wall-clock duration is at least (N-1)*per — i.e. the limiter
// actually throttled the burst, with no individual-request flakiness window.
func TestAuthRateLimitDelaysBurstRequests(t *testing.T) {
	gin.SetMode(gin.TestMode)

	const (
		per = 50 * time.Millisecond
		n   = 5
	)

	r := gin.New()
	r.Use(newAuthRateLimit(zap.NewNop(), 1, per))
	r.POST("/auth/login", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	start := time.Now()
	for i := 0; i < n; i++ {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
		req.RemoteAddr = "127.0.0.1:1234"
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("request %d: expected 200 got %d", i, rec.Code)
		}
	}
	elapsed := time.Since(start)

	// With rate 1/per and no slack the Nth request waits (N-1)*per in total.
	// Allow a small tolerance for scheduling jitter.
	wantMin := time.Duration(n-1)*per - 5*time.Millisecond
	if elapsed < wantMin {
		t.Fatalf("expected at least %v of throttling, got %v", wantMin, elapsed)
	}
}

// TestAuthRateLimitPartitionsByClientIP verifies the limiter tracks per-IP
// state: a fresh IP should not be throttled even if another IP just exhausted
// its budget.
func TestAuthRateLimitPartitionsByClientIP(t *testing.T) {
	gin.SetMode(gin.TestMode)

	const per = 100 * time.Millisecond

	r := gin.New()
	r.Use(newAuthRateLimit(zap.NewNop(), 1, per))
	r.POST("/auth/login", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})

	// Exhaust IP A's first token.
	reqA := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
	reqA.RemoteAddr = "10.0.0.1:1111"
	r.ServeHTTP(httptest.NewRecorder(), reqA)

	// A second call on IP B, issued immediately after, should not have been
	// queued behind IP A.
	start := time.Now()
	reqB := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
	reqB.RemoteAddr = "10.0.0.2:2222"
	recB := httptest.NewRecorder()
	r.ServeHTTP(recB, reqB)
	elapsed := time.Since(start)

	if recB.Code != http.StatusOK {
		t.Fatalf("expected IP B to pass, got %d", recB.Code)
	}
	// IP B should have been served without a full `per` delay. Give a
	// generous ceiling for CI noise (half of per).
	if elapsed >= per/2 {
		t.Fatalf("IP B was throttled by IP A's bucket: waited %v", elapsed)
	}
}

// TestAuthRateLimitPanicsWithNilLogger protects against misuse — the factory
// explicitly panics rather than silently returning a non-logging limiter.
func TestAuthRateLimitPanicsWithNilLogger(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Fatal("expected panic with nil logger")
		}
	}()
	newAuthRateLimit(nil, 1, time.Second)
}
