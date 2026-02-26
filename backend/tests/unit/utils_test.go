package unit_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"nexia-backend/internal/config"
	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func TestJWTGenerateAndValidate(t *testing.T) {
	cfg := &config.Config{Server: config.ServerConfig{JWTSecret: "secret", JWTExpiryMinutes: 1}}
	token, err := utils.GenerateToken(123, cfg)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}

	claims, err := utils.ValidateToken(token, cfg)
	if err != nil {
		t.Fatalf("validate token: %v", err)
	}
	if claims.UserID != 123 {
		t.Fatalf("expected user 123, got %d", claims.UserID)
	}
	if claims.ExpiresAt == nil || claims.IssuedAt == nil {
		t.Fatal("expected exp and iat claims")
	}
	if claims.ExpiresAt.Time.Before(time.Now()) {
		t.Fatal("expected non-expired token")
	}

	badCfg := &config.Config{Server: config.ServerConfig{JWTSecret: "wrong-secret"}}
	if _, err := utils.ValidateToken(token, badCfg); err == nil {
		t.Fatal("expected signature validation error")
	}

	if _, err := utils.ValidateToken("not-a-token", cfg); err == nil {
		t.Fatal("expected parse error for invalid token format")
	}
}

func TestJWTDefaultExpiry(t *testing.T) {
	cfg := &config.Config{Server: config.ServerConfig{JWTSecret: "secret", JWTExpiryMinutes: 0}}
	token, err := utils.GenerateToken(321, cfg)
	if err != nil {
		t.Fatalf("generate token: %v", err)
	}
	claims, err := utils.ValidateToken(token, cfg)
	if err != nil {
		t.Fatalf("validate token: %v", err)
	}
	if claims.ExpiresAt == nil || claims.IssuedAt == nil {
		t.Fatal("expected exp and iat")
	}
	if claims.ExpiresAt.Time.Sub(claims.IssuedAt.Time) < (23 * time.Hour) {
		t.Fatalf("expected default expiry around 24h, got %s", claims.ExpiresAt.Time.Sub(claims.IssuedAt.Time))
	}
}

func TestRespondHelpers(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	utils.RespondWithError(c, http.StatusBadRequest, "BAD", "bad request")
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d", w.Code)
	}
	var errResp map[string]map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &errResp); err != nil {
		t.Fatalf("unmarshal error response: %v", err)
	}
	if errResp["error"]["code"] != "BAD" {
		t.Fatalf("expected code BAD got %s", errResp["error"]["code"])
	}

	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)
	utils.RespondWithSuccess(c, http.StatusCreated, gin.H{"ok": true})
	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 got %d", w.Code)
	}
}
