package integration_test

import (
	"fmt"
	"net/http"
	"strings"
	"testing"

	"nexia-backend/internal/config"

	"github.com/stretchr/testify/require"
)

func TestChatFlowIntegration(t *testing.T) {
	kit := buildRouter(t, true)
	token, _, _ := signupAndGetToken(t, kit, "chat-user@example.com")

	t.Run("chat succeeds", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/chat", map[string]any{"message": "Who likes rock music?"}, token)
		requireStatus(t, w, http.StatusOK)
		result := decodeJSONMap(t, w)
		require.NotEmpty(t, strings.TrimSpace(fmt.Sprintf("%v", result["response"])))
	})

	t.Run("chat validation error", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/chat", map[string]any{}, token)
		requireStatus(t, w, http.StatusBadRequest)
	})

	t.Run("chat unauthorized", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/chat", map[string]any{"message": "hello"}, "")
		requireStatus(t, w, http.StatusUnauthorized)
	})

	t.Run("chat internal failure returns server error envelope", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/chat", map[string]any{"message": "trigger-ai-fail"}, token)
		requireErrorCode(t, w, http.StatusInternalServerError, "SERVER_ERROR")
	})
}

func TestChatUnavailableIntegration(t *testing.T) {
	kit := buildRouter(t, false)
	token, _, _ := signupAndGetToken(t, kit, "chat-unavailable@example.com")

	w := postJSON(t, kit, "/api/v1/chat", map[string]any{"message": "hello"}, token)
	requireErrorCode(t, w, http.StatusServiceUnavailable, "AI_UNAVAILABLE")
}

func TestChatRateLimitIntegration(t *testing.T) {
	kit := buildRouterWithServerConfig(t, true, config.ServerConfig{
		ChatRateLimitRequests:      1,
		ChatRateLimitWindowSeconds: 60,
		ChatRateLimitBurst:         1,
	})
	token, _, _ := signupAndGetToken(t, kit, "chat-rate-limit@example.com")

	first := postJSON(t, kit, "/api/v1/chat", map[string]any{"message": "first"}, token)
	requireStatus(t, first, http.StatusOK)

	second := postJSON(t, kit, "/api/v1/chat", map[string]any{"message": "second"}, token)
	requireErrorCode(t, second, http.StatusTooManyRequests, "RATE_LIMITED")
	require.Equal(t, "60", second.Header().Get("Retry-After"))
}
