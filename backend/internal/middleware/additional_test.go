package middleware_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"nexia-backend/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
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
		require.Equal(t, http.StatusOK, w.Code)
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
		require.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("missing csrf cookie", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/protected", nil)
		mkRouter(http.MethodPost, true).ServeHTTP(w, req)
		require.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("mismatched csrf header", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/protected", nil)
		req.AddCookie(&http.Cookie{Name: middleware.CSRFCookieName, Value: "cookie-token"})
		req.Header.Set(middleware.CSRFHeaderName, "header-token")
		mkRouter(http.MethodPost, true).ServeHTTP(w, req)
		require.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("matching csrf token succeeds", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/protected", nil)
		req.AddCookie(&http.Cookie{Name: middleware.CSRFCookieName, Value: "same-token"})
		req.Header.Set(middleware.CSRFHeaderName, "same-token")
		mkRouter(http.MethodPost, true).ServeHTTP(w, req)
		require.Equal(t, http.StatusOK, w.Code)
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
	require.Equal(t, http.StatusOK, w.Code)
	require.Equal(t, "req-123", w.Header().Get("X-Request-ID"))

	var out map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &out))
	require.Equal(t, "req-123", out["request_id"])

	panicW := httptest.NewRecorder()
	panicReq := httptest.NewRequest(http.MethodGet, "/panic", nil)
	r.ServeHTTP(panicW, panicReq)
	require.Equal(t, http.StatusInternalServerError, panicW.Code)
	require.GreaterOrEqual(t, observed.Len(), 2)
}
