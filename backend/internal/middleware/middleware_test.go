package middleware_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"nexia-backend/internal/config"
	"nexia-backend/internal/middleware"
	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func TestGetUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())

	if _, err := middleware.GetUserID(c); err == nil {
		t.Fatal("expected error when user id missing")
	}

	c.Set("userID", "bad")
	if _, err := middleware.GetUserID(c); err == nil {
		t.Fatal("expected error for wrong type")
	}

	c.Set("userID", uint64(55))
	id, err := middleware.GetUserID(c)
	if err != nil || id != 55 {
		t.Fatalf("expected 55, got %d err=%v", id, err)
	}
}

func TestAuthMiddleware(t *testing.T) {
	cfg := &config.Config{Server: config.ServerConfig{JWTSecret: "secret", JWTExpiryMinutes: 30}}
	token, err := utils.GenerateToken(101, cfg)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	mkRouter := func() *gin.Engine {
		r := gin.New()
		r.Use(middleware.AuthMiddleware(cfg))
		r.GET("/protected", func(c *gin.Context) {
			id, _ := c.Get("userID")
			c.JSON(http.StatusOK, gin.H{"user_id": id})
		})
		return r
	}

	t.Run("missing token", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		mkRouter().ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 got %d", w.Code)
		}
	})

	t.Run("invalid header format", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Token x")
		mkRouter().ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 got %d", w.Code)
		}
	})

	t.Run("valid bearer token", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		mkRouter().ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
		}
		var out map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		if out["user_id"].(float64) != 101 {
			t.Fatalf("expected user_id=101 got %v", out["user_id"])
		}
	})

	t.Run("valid cookie token", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.AddCookie(&http.Cookie{Name: "nexia_token", Value: token})
		mkRouter().ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d", w.Code)
		}
	})

	t.Run("invalid token", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer bad-token")
		mkRouter().ServeHTTP(w, req)
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 got %d", w.Code)
		}
	})
}
