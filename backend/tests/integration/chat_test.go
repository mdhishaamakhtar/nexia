package integration_test

import (
	"fmt"
	"net/http"
	"strings"
	"testing"
)

func TestChatFlowIntegration(t *testing.T) {
	kit := buildRouter(t, true)
	token, _, _ := signupAndGetToken(t, kit, "chat-user@example.com")

	t.Run("chat succeeds", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/chat", map[string]any{"message": "Who likes rock music?"}, token)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
		}
		result := decodeJSONMap(t, w)
		if strings.TrimSpace(fmt.Sprintf("%v", result["response"])) == "" {
			t.Fatalf("expected non-empty response")
		}
	})

	t.Run("chat validation error", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/chat", map[string]any{}, token)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d", w.Code)
		}
	})

	t.Run("chat unauthorized", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/chat", map[string]any{"message": "hello"}, "")
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 got %d", w.Code)
		}
	})

	t.Run("chat internal failure returns server error envelope", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/chat", map[string]any{"message": "trigger-ai-fail"}, token)
		if w.Code != http.StatusInternalServerError {
			t.Fatalf("expected 500 got %d body=%s", w.Code, w.Body.String())
		}
		result := decodeJSONMap(t, w)
		errObj := result["error"].(map[string]any)
		if errObj["code"] != "SERVER_ERROR" {
			t.Fatalf("expected SERVER_ERROR got %v", errObj["code"])
		}
	})
}

func TestChatUnavailableIntegration(t *testing.T) {
	kit := buildRouter(t, false)
	token, _, _ := signupAndGetToken(t, kit, "chat-unavailable@example.com")

	w := postJSON(t, kit, "/api/v1/chat", map[string]any{"message": "hello"}, token)
	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 got %d body=%s", w.Code, w.Body.String())
	}
	result := decodeJSONMap(t, w)
	errObj := result["error"].(map[string]any)
	if errObj["code"] != "AI_UNAVAILABLE" {
		t.Fatalf("expected AI_UNAVAILABLE got %v", errObj["code"])
	}
}
