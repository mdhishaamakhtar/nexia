package integration_test

import (
	"fmt"
	"net/http"
	"testing"
)

func TestSignupIntegration(t *testing.T) {
	r := buildRouter(t, false)

	t.Run("signup returns 201 and sends verification email", func(t *testing.T) {
		w := postJSON(t, r, "/api/v1/auth/signup", map[string]any{"email": "signup-ok@example.com", "password": "pass123"}, "")
		if w.Code != http.StatusCreated {
			t.Fatalf("expected 201 got %d body=%s", w.Code, w.Body.String())
		}
		result := decodeJSONMap(t, w)
		if result["message"] == nil {
			t.Fatal("expected message in response")
		}
	})

	t.Run("signup duplicate email returns 409", func(t *testing.T) {
		postJSON(t, r, "/api/v1/auth/signup", map[string]any{"email": "dup@example.com", "password": "pass123"}, "")
		w := postJSON(t, r, "/api/v1/auth/signup", map[string]any{"email": "dup@example.com", "password": "pass123"}, "")
		if w.Code != http.StatusConflict {
			t.Fatalf("expected 409 got %d body=%s", w.Code, w.Body.String())
		}
		out := decodeJSONMap(t, w)
		errObj := out["error"].(map[string]any)
		if errObj["code"] != "EMAIL_CONFLICT" {
			t.Fatalf("expected EMAIL_CONFLICT got %v", errObj["code"])
		}
	})

	t.Run("signup invalid email format returns 400", func(t *testing.T) {
		w := postJSON(t, r, "/api/v1/auth/signup", map[string]any{"email": "not-an-email", "password": "pass123"}, "")
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("signup password too short returns 400", func(t *testing.T) {
		w := postJSON(t, r, "/api/v1/auth/signup", map[string]any{"email": "short-pass@example.com", "password": "abc"}, "")
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("signup missing fields returns 400", func(t *testing.T) {
		w := postJSON(t, r, "/api/v1/auth/signup", map[string]any{"email": "missing@example.com"}, "")
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
		}
	})
}

func TestVerifyEmailIntegration(t *testing.T) {
	r := buildRouter(t, false)
	const email = "verify@example.com"

	// Signup first
	w := postJSON(t, r, "/api/v1/auth/signup", map[string]any{"email": email, "password": "pass123"}, "")
	if w.Code != http.StatusCreated {
		t.Fatalf("signup expected 201 got %d body=%s", w.Code, w.Body.String())
	}

	t.Run("login before verify returns 403", func(t *testing.T) {
		w := postJSON(t, r, "/api/v1/auth/login", map[string]any{"email": email, "password": "pass123"}, "")
		if w.Code != http.StatusForbidden {
			t.Fatalf("expected 403 got %d body=%s", w.Code, w.Body.String())
		}
		out := decodeJSONMap(t, w)
		errObj := out["error"].(map[string]any)
		if errObj["code"] != "EMAIL_NOT_VERIFIED" {
			t.Fatalf("expected EMAIL_NOT_VERIFIED got %v", errObj["code"])
		}
	})

	t.Run("invalid token returns 404", func(t *testing.T) {
		w := doRequest(t, r, "GET", "/api/v1/auth/verify-email?token=bogustoken", nil, "")
		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404 got %d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("missing token returns 400", func(t *testing.T) {
		w := doRequest(t, r, "GET", "/api/v1/auth/verify-email", nil, "")
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("valid token verifies email and allows login", func(t *testing.T) {
		token := testStore.getVerifyTokenForEmail(email)
		if token == "" {
			t.Fatal("expected a verify token to be stored after signup")
		}

		w := doRequest(t, r, "GET", fmt.Sprintf("/api/v1/auth/verify-email?token=%s", token), nil, "")
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
		}

		loginW := postJSON(t, r, "/api/v1/auth/login", map[string]any{"email": email, "password": "pass123"}, "")
		if loginW.Code != http.StatusOK {
			t.Fatalf("login after verify expected 200 got %d body=%s", loginW.Code, loginW.Body.String())
		}
	})
}

func TestLoginIntegration(t *testing.T) {
	r := buildRouter(t, false)

	t.Run("invalid credentials returns 401", func(t *testing.T) {
		signupAndGetToken(t, r, "login-test@example.com")
		w := postJSON(t, r, "/api/v1/auth/login", map[string]any{"email": "login-test@example.com", "password": "wrongpass"}, "")
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 got %d body=%s", w.Code, w.Body.String())
		}
		out := decodeJSONMap(t, w)
		errObj := out["error"].(map[string]any)
		if errObj["code"] != "UNAUTHORIZED" {
			t.Fatalf("expected UNAUTHORIZED got %v", errObj["code"])
		}
	})

	t.Run("unknown email returns 401", func(t *testing.T) {
		w := postJSON(t, r, "/api/v1/auth/login", map[string]any{"email": "nobody@example.com", "password": "pass123"}, "")
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 got %d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("missing fields returns 400", func(t *testing.T) {
		w := postJSON(t, r, "/api/v1/auth/login", map[string]any{"email": "someone@example.com"}, "")
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
		}
	})
}

func TestSessionAndLogoutIntegration(t *testing.T) {
	r := buildRouter(t, false)
	_, cookie := signupAndGetToken(t, r, "session@example.com")

	t.Run("auth/me returns user info with valid cookie", func(t *testing.T) {
		w := doRequest(t, r, "GET", "/api/v1/auth/me", nil, "", cookie)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
		}
		result := decodeJSONMap(t, w)
		if result["authenticated"] != true {
			t.Fatalf("expected authenticated=true got %v", result["authenticated"])
		}
	})

	t.Run("logout clears cookie", func(t *testing.T) {
		w := doRequest(t, r, "POST", "/api/v1/auth/logout", nil, "", cookie)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
		}
		cleared := false
		for _, c := range w.Result().Cookies() {
			if c.Name == "nexia_token" && c.MaxAge < 0 {
				cleared = true
				break
			}
		}
		if !cleared {
			t.Fatal("expected logout to clear nexia_token cookie")
		}
	})

	t.Run("auth/me returns 401 without token", func(t *testing.T) {
		w := doRequest(t, r, "GET", "/api/v1/auth/me", nil, "")
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 got %d body=%s", w.Code, w.Body.String())
		}
	})
}

func TestForgotPasswordIntegration(t *testing.T) {
	r := buildRouter(t, false)

	t.Run("forgot password always returns 200 (anti-enumeration)", func(t *testing.T) {
		w := postJSON(t, r, "/api/v1/auth/forgot-password", map[string]any{"email": "nonexistent@example.com"}, "")
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("forgot password for existing user stores reset token", func(t *testing.T) {
		const email = "forgot@example.com"
		signupAndGetToken(t, r, email)

		w := postJSON(t, r, "/api/v1/auth/forgot-password", map[string]any{"email": email}, "")
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
		}
		tok := testStore.getResetTokenForEmail(email)
		if tok == "" {
			t.Fatal("expected a reset token to be stored after forgot-password")
		}
	})

	t.Run("forgot password missing email field returns 400", func(t *testing.T) {
		w := postJSON(t, r, "/api/v1/auth/forgot-password", map[string]any{}, "")
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
		}
	})
}

func TestResetPasswordIntegration(t *testing.T) {
	r := buildRouter(t, false)
	const email = "reset@example.com"
	signupAndGetToken(t, r, email)

	postJSON(t, r, "/api/v1/auth/forgot-password", map[string]any{"email": email}, "")
	resetToken := testStore.getResetTokenForEmail(email)
	if resetToken == "" {
		t.Fatal("expected a reset token after forgot-password")
	}

	t.Run("invalid token returns 404", func(t *testing.T) {
		w := postJSON(t, r, "/api/v1/auth/reset-password", map[string]any{"token": "bogustoken", "new_password": "newpass123"}, "")
		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404 got %d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("password too short returns 400", func(t *testing.T) {
		w := postJSON(t, r, "/api/v1/auth/reset-password", map[string]any{"token": resetToken, "new_password": "abc"}, "")
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("missing fields returns 400", func(t *testing.T) {
		w := postJSON(t, r, "/api/v1/auth/reset-password", map[string]any{"token": resetToken}, "")
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("valid token resets password and allows login", func(t *testing.T) {
		w := postJSON(t, r, "/api/v1/auth/reset-password", map[string]any{"token": resetToken, "new_password": "newpass456"}, "")
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
		}

		loginW := postJSON(t, r, "/api/v1/auth/login", map[string]any{"email": email, "password": "newpass456"}, "")
		if loginW.Code != http.StatusOK {
			t.Fatalf("login with new password expected 200 got %d body=%s", loginW.Code, loginW.Body.String())
		}
	})

	t.Run("used token returns 404", func(t *testing.T) {
		// resetToken was already consumed in the previous sub-test
		w := postJSON(t, r, "/api/v1/auth/reset-password", map[string]any{"token": resetToken, "new_password": "anotherpass"}, "")
		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404 for used token got %d body=%s", w.Code, w.Body.String())
		}
	})
}
