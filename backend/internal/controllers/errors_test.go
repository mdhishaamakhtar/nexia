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
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// TestRespondWithServiceErrorMapping verifies every branch of the switch.
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

			require.Equal(t, tc.wantCode, w.Code)

			var body map[string]any
			require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))

			errObj, ok := body["error"].(map[string]any)
			require.True(t, ok, w.Body.String())
			require.Equal(t, tc.wantKey, errObj["code"])
		})
	}
}
