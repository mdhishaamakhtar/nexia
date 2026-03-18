package middleware_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"nexia-backend/internal/middleware"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
)

func TestCSRFMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mkRouter := func(method string, setAuth bool) *gin.Engine {
		r := gin.New()
		r.Use(func(c *gin.Context) {
			if setAuth {
				c.Set("authMethod", "cookie")
			}
			c.Next()
		})
		r.Use(middleware.CSRFMiddleware())
		r.Handle(method, "/protected", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"ok": true})
		})
		return r
	}

	t.Run("safe method bypasses csrf", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		mkRouter(http.MethodGet, true).ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d", w.Code)
		}
	})

	t.Run("bearer auth bypasses csrf", func(t *testing.T) {
		r := gin.New()
		r.Use(func(c *gin.Context) {
			c.Set("authMethod", "bearer")
			c.Next()
		})
		r.Use(middleware.CSRFMiddleware())
		r.POST("/protected", func(c *gin.Context) { c.Status(http.StatusOK) })

		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/protected", nil)
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d", w.Code)
		}
	})

	t.Run("missing csrf cookie", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/protected", nil)
		mkRouter(http.MethodPost, true).ServeHTTP(w, req)
		if w.Code != http.StatusForbidden {
			t.Fatalf("expected 403 got %d", w.Code)
		}
	})

	t.Run("mismatched csrf header", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/protected", nil)
		req.AddCookie(&http.Cookie{Name: middleware.CSRFCookieName, Value: "cookie-token"})
		req.Header.Set(middleware.CSRFHeaderName, "header-token")
		mkRouter(http.MethodPost, true).ServeHTTP(w, req)
		if w.Code != http.StatusForbidden {
			t.Fatalf("expected 403 got %d", w.Code)
		}
	})

	t.Run("matching csrf token succeeds", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/protected", nil)
		req.AddCookie(&http.Cookie{Name: middleware.CSRFCookieName, Value: "same-token"})
		req.Header.Set(middleware.CSRFHeaderName, "same-token")
		mkRouter(http.MethodPost, true).ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d", w.Code)
		}
	})
}

func TestRequestContextAndRecovery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	core, observed := observer.New(zap.DebugLevel)
	logger := zap.New(core)

	r := gin.New()
	r.Use(middleware.RequestContext(logger))
	r.Use(middleware.Recovery(logger))
	r.GET("/ok", func(c *gin.Context) {
		c.Set("userID", uint64(9))
		c.JSON(http.StatusOK, gin.H{"request_id": middleware.GetRequestID(c)})
	})
	r.GET("/panic", func(c *gin.Context) {
		panic("boom")
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/ok", nil)
	req.Header.Set("X-Request-ID", "req-123")
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d", w.Code)
	}
	if w.Header().Get("X-Request-ID") != "req-123" {
		t.Fatalf("expected response request id, got %q", w.Header().Get("X-Request-ID"))
	}
	var out map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if out["request_id"] != "req-123" {
		t.Fatalf("expected request id in handler, got %v", out["request_id"])
	}

	panicW := httptest.NewRecorder()
	panicReq := httptest.NewRequest(http.MethodGet, "/panic", nil)
	r.ServeHTTP(panicW, panicReq)
	if panicW.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 got %d", panicW.Code)
	}
	if observed.Len() < 2 {
		t.Fatalf("expected request and recovery logs, got %d", observed.Len())
	}
}
