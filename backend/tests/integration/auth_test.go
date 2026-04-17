package integration_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestSignupIntegration(t *testing.T) {
	kit := buildRouter(t, false)

	t.Run("signup returns 201 and sends verification email", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/auth/signup", map[string]any{"email": "signup-ok@example.com", "password": "pass123"}, "")
		requireStatus(t, w, http.StatusCreated)
		require.NotNil(t, decodeJSONMap(t, w)["message"])
	})

	t.Run("signup duplicate email returns 409", func(t *testing.T) {
		postJSON(t, kit, "/api/v1/auth/signup", map[string]any{"email": "dup@example.com", "password": "pass123"}, "")
		w := postJSON(t, kit, "/api/v1/auth/signup", map[string]any{"email": "dup@example.com", "password": "pass123"}, "")
		requireErrorCode(t, w, http.StatusConflict, "EMAIL_CONFLICT")
	})

	t.Run("signup invalid email format returns 400", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/auth/signup", map[string]any{"email": "not-an-email", "password": "pass123"}, "")
		requireStatus(t, w, http.StatusBadRequest)
	})

	t.Run("signup password too short returns 400", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/auth/signup", map[string]any{"email": "short-pass@example.com", "password": "abc"}, "")
		requireStatus(t, w, http.StatusBadRequest)
	})

	t.Run("signup missing fields returns 400", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/auth/signup", map[string]any{"email": "missing@example.com"}, "")
		requireStatus(t, w, http.StatusBadRequest)
	})
}

func TestVerifyEmailIntegration(t *testing.T) {
	kit := buildRouter(t, false)
	const email = "verify@example.com"

	w := postJSON(t, kit, "/api/v1/auth/signup", map[string]any{"email": email, "password": "pass123"}, "")
	requireStatus(t, w, http.StatusCreated)

	t.Run("login before verify returns 403", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/auth/login", map[string]any{"email": email, "password": "pass123"}, "")
		requireErrorCode(t, w, http.StatusForbidden, "EMAIL_NOT_VERIFIED")
	})

	t.Run("invalid token returns 404", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodGet, "/api/v1/auth/verify-email?token=bogustoken", nil, "")
		requireStatus(t, w, http.StatusNotFound)
	})

	t.Run("missing token returns 400", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodGet, "/api/v1/auth/verify-email", nil, "")
		requireStatus(t, w, http.StatusBadRequest)
	})

	t.Run("valid token verifies email and allows login", func(t *testing.T) {
		token := kit.getVerifyTokenForEmail(t, email)

		w := doRequest(t, kit, http.MethodGet, fmt.Sprintf("/api/v1/auth/verify-email?token=%s", token), nil, "")
		requireStatus(t, w, http.StatusOK)

		loginW := postJSON(t, kit, "/api/v1/auth/login", map[string]any{"email": email, "password": "pass123"}, "")
		requireStatus(t, loginW, http.StatusOK)
	})
}

func TestLoginIntegration(t *testing.T) {
	kit := buildRouter(t, false)

	t.Run("invalid credentials returns 401", func(t *testing.T) {
		signupAndGetToken(t, kit, "login-test@example.com")
		w := postJSON(t, kit, "/api/v1/auth/login", map[string]any{"email": "login-test@example.com", "password": "wrongpass"}, "")
		requireErrorCode(t, w, http.StatusUnauthorized, "UNAUTHORIZED")
	})

	t.Run("unknown email returns 401", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/auth/login", map[string]any{"email": "nobody@example.com", "password": "pass123"}, "")
		requireStatus(t, w, http.StatusUnauthorized)
	})

	t.Run("missing fields returns 400", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/auth/login", map[string]any{"email": "someone@example.com"}, "")
		requireStatus(t, w, http.StatusBadRequest)
	})
}

func TestSessionAndLogoutIntegration(t *testing.T) {
	kit := buildRouter(t, false)
	_, cookie, csrfCookie := signupAndGetToken(t, kit, "session@example.com")

	t.Run("auth/me returns user info with valid cookie", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodGet, "/api/v1/auth/me", nil, "", cookie, csrfCookie)
		requireStatus(t, w, http.StatusOK)
		require.Equal(t, true, decodeJSONMap(t, w)["authenticated"])
	})

	t.Run("logout clears cookie", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodPost, "/api/v1/auth/logout", nil, "", cookie, csrfCookie)
		requireStatus(t, w, http.StatusOK)

		cleared := false
		for _, c := range w.Result().Cookies() {
			if c.Name == "nexia_token" && c.MaxAge < 0 {
				cleared = true
				break
			}
		}
		require.True(t, cleared)
	})

	t.Run("auth/me returns 401 without token", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodGet, "/api/v1/auth/me", nil, "")
		requireStatus(t, w, http.StatusUnauthorized)
	})
}

func TestForgotPasswordIntegration(t *testing.T) {
	kit := buildRouter(t, false)

	t.Run("forgot password always returns 200 (anti-enumeration)", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/auth/forgot-password", map[string]any{"email": "nonexistent@example.com"}, "")
		requireStatus(t, w, http.StatusOK)
	})

	t.Run("forgot password for existing user stores reset token", func(t *testing.T) {
		const email = "forgot@example.com"
		signupAndGetToken(t, kit, email)

		w := postJSON(t, kit, "/api/v1/auth/forgot-password", map[string]any{"email": email}, "")
		requireStatus(t, w, http.StatusOK)
		require.NotEmpty(t, kit.getResetTokenForEmail(t, email))
	})

	t.Run("forgot password missing email field returns 400", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/auth/forgot-password", map[string]any{}, "")
		requireStatus(t, w, http.StatusBadRequest)
	})
}

func TestResetPasswordIntegration(t *testing.T) {
	kit := buildRouter(t, false)
	const email = "reset@example.com"
	signupAndGetToken(t, kit, email)

	postJSON(t, kit, "/api/v1/auth/forgot-password", map[string]any{"email": email}, "")
	resetToken := kit.getResetTokenForEmail(t, email)

	t.Run("invalid token returns 404", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/auth/reset-password", map[string]any{"token": "bogustoken", "new_password": "newpass123"}, "")
		requireStatus(t, w, http.StatusNotFound)
	})

	t.Run("password too short returns 400", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/auth/reset-password", map[string]any{"token": resetToken, "new_password": "abc"}, "")
		requireStatus(t, w, http.StatusBadRequest)
	})

	t.Run("missing fields returns 400", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/auth/reset-password", map[string]any{"token": resetToken}, "")
		requireStatus(t, w, http.StatusBadRequest)
	})

	t.Run("valid token resets password and allows login", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/auth/reset-password", map[string]any{"token": resetToken, "new_password": "newpass456"}, "")
		requireStatus(t, w, http.StatusOK)

		loginW := postJSON(t, kit, "/api/v1/auth/login", map[string]any{"email": email, "password": "newpass456"}, "")
		requireStatus(t, loginW, http.StatusOK)
	})

	t.Run("used token returns 404", func(t *testing.T) {
		w := postJSON(t, kit, "/api/v1/auth/reset-password", map[string]any{"token": resetToken, "new_password": "anotherpass"}, "")
		requireStatus(t, w, http.StatusNotFound)
	})
}
