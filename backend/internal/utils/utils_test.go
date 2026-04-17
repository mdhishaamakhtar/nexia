package utils_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"nexia-backend/internal/config"
	"nexia-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestJWTGenerateAndValidate(t *testing.T) {
	cfg := &config.Config{Server: config.ServerConfig{JWTSecret: "secret", JWTExpiryMinutes: 1}}
	token, err := utils.GenerateToken(123, cfg)
	require.NoError(t, err)

	claims, err := utils.ValidateToken(token, cfg)
	require.NoError(t, err)
	require.Equal(t, uint64(123), claims.UserID)
	require.NotNil(t, claims.ExpiresAt)
	require.NotNil(t, claims.IssuedAt)
	require.False(t, claims.ExpiresAt.Time.Before(time.Now()))

	_, err = utils.ValidateToken(token, &config.Config{Server: config.ServerConfig{JWTSecret: "wrong-secret"}})
	require.Error(t, err)

	_, err = utils.ValidateToken("not-a-token", cfg)
	require.Error(t, err)
}

func TestJWTDefaultExpiry(t *testing.T) {
	cfg := &config.Config{Server: config.ServerConfig{JWTSecret: "secret", JWTExpiryMinutes: 0}}
	token, err := utils.GenerateToken(321, cfg)
	require.NoError(t, err)

	claims, err := utils.ValidateToken(token, cfg)
	require.NoError(t, err)
	require.NotNil(t, claims.ExpiresAt)
	require.NotNil(t, claims.IssuedAt)
	require.GreaterOrEqual(t, claims.ExpiresAt.Time.Sub(claims.IssuedAt.Time), 23*time.Hour)
}

func TestRespondHelpers(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	utils.RespondWithError(c, http.StatusBadRequest, "BAD", "bad request")
	require.Equal(t, http.StatusBadRequest, w.Code)

	var errResp map[string]map[string]string
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &errResp))
	require.Equal(t, "BAD", errResp["error"]["code"])

	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)
	utils.RespondWithSuccess(c, http.StatusCreated, gin.H{"ok": true})
	require.Equal(t, http.StatusCreated, w.Code)
}

func TestGenerateCSRFToken(t *testing.T) {
	token, err := utils.GenerateCSRFToken()
	require.NoError(t, err)
	require.GreaterOrEqual(t, len(token), 32)
	require.False(t, strings.Contains(token, " "))
}
