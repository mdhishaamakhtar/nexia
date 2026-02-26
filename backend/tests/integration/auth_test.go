package integration_test

import (
	"net/http"
	"testing"
)

func TestAuthFlowIntegration(t *testing.T) {
	r := buildRouter(t, true)

	t.Run("signup then login succeeds", func(t *testing.T) {
		_, _ = signupAndGetToken(t, r, "auth-user")
		resp := postJSON(t, r, "/api/v1/auth", map[string]any{"username": "auth-user", "password": "pass123"}, "")
		if resp.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d body=%s", resp.Code, resp.Body.String())
		}
	})

	t.Run("invalid password returns unauthorized envelope", func(t *testing.T) {
		resp := postJSON(t, r, "/api/v1/auth", map[string]any{"username": "auth-user", "password": "wrong-pass"}, "")
		if resp.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 got %d body=%s", resp.Code, resp.Body.String())
		}
		out := decodeJSONMap(t, resp)
		errObj := out["error"].(map[string]any)
		if errObj["code"] != "UNAUTHORIZED" {
			t.Fatalf("expected UNAUTHORIZED code got %v", errObj["code"])
		}
	})

	t.Run("missing fields returns validation error", func(t *testing.T) {
		resp := postJSON(t, r, "/api/v1/auth", map[string]any{"username": "only-user"}, "")
		if resp.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d body=%s", resp.Code, resp.Body.String())
		}
	})

	t.Run("session and logout via cookie", func(t *testing.T) {
		_, cookie := signupAndGetToken(t, r, "session-user")

		meResp := doRequest(t, r, http.MethodGet, "/api/v1/auth/me", nil, "", cookie)
		if meResp.Code != http.StatusOK {
			t.Fatalf("expected 200 from /auth/me got %d body=%s", meResp.Code, meResp.Body.String())
		}

		logoutResp := doRequest(t, r, http.MethodPost, "/api/v1/auth/logout", nil, "", cookie)
		if logoutResp.Code != http.StatusOK {
			t.Fatalf("expected 200 from /auth/logout got %d body=%s", logoutResp.Code, logoutResp.Body.String())
		}

		cleared := false
		for _, c := range logoutResp.Result().Cookies() {
			if c.Name == "nexia_token" && c.MaxAge < 0 {
				cleared = true
				break
			}
		}
		if !cleared {
			t.Fatal("expected logout to clear nexia_token cookie")
		}

		meAfterLogout := doRequest(t, r, http.MethodGet, "/api/v1/auth/me", nil, "")
		if meAfterLogout.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 from /auth/me after logout got %d body=%s", meAfterLogout.Code, meAfterLogout.Body.String())
		}
	})
}
