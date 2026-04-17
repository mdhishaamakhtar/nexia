package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"nexia-backend/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// TestRespondWithServiceErrorMapping verifies every branch of the switch —
// each sentinel service error maps to the expected HTTP status and error code.
// Previously only partially covered through integration tests; this pins the
// contract at the unit level.
func TestRespondWithServiceErrorMapping(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cases := []struct {
		name     string
		err      error
		wantCode int
		wantKey  string
	}{
		{"account not found", services.ErrAccountNotFound, http.StatusUnauthorized, "ACCOUNT_NOT_FOUND"},
		{"unauthorized", services.ErrUnauthorized, http.StatusUnauthorized, "UNAUTHORIZED"},
		{"validation wrapped", fmt.Errorf("%w: bad input", services.ErrValidation), http.StatusBadRequest, "VALIDATION_ERROR"},
		{"sentinel not found", services.ErrNotFound, http.StatusNotFound, "NOT_FOUND"},
		{"gorm record not found", gorm.ErrRecordNotFound, http.StatusNotFound, "NOT_FOUND"},
		{"ai unavailable", services.ErrAIUnavailable, http.StatusServiceUnavailable, "AI_UNAVAILABLE"},
		{"email not verified", services.ErrEmailNotVerified, http.StatusForbidden, "EMAIL_NOT_VERIFIED"},
		{"email conflict", services.ErrEmailConflict, http.StatusConflict, "EMAIL_CONFLICT"},
		{"unknown error falls through to 500", errors.New("some wild error"), http.StatusInternalServerError, "SERVER_ERROR"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			respondWithServiceError(c, tc.err)

			if w.Code != tc.wantCode {
				t.Fatalf("status: want %d got %d", tc.wantCode, w.Code)
			}
			var body map[string]any
			if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
				t.Fatalf("unmarshal: %v", err)
			}
			errObj, ok := body["error"].(map[string]any)
			if !ok {
				t.Fatalf("expected error envelope, got %s", w.Body.String())
			}
			if errObj["code"] != tc.wantKey {
				t.Fatalf("code: want %s got %v", tc.wantKey, errObj["code"])
			}
		})
	}
}
