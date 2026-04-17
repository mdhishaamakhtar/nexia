package email

import (
	"errors"
	"testing"

	"nexia-backend/internal/config"

	resend "github.com/resend/resend-go/v2"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestNewEmailServiceDisabledWithoutAPIKey(t *testing.T) {
	cfg := &config.Config{
		Email: config.EmailConfig{
			FromAddress: "Nexia <noreply@example.com>",
			AppBaseURL:  "https://app.example.com",
		},
	}

	svc := NewEmailService(cfg, zap.NewNop())

	require.False(t, svc.enabled)
	require.Nil(t, svc.sendEmail)
	require.NoError(t, svc.SendVerificationEmail("user@example.com", "token"))
	require.NoError(t, svc.SendPasswordResetEmail("user@example.com", "token"))
}

func TestNewEmailServiceEnabled(t *testing.T) {
	cfg := &config.Config{
		Email: config.EmailConfig{
			ResendAPIKey: "test-api-key",
			FromAddress:  "Nexia <noreply@example.com>",
			AppBaseURL:   "https://app.example.com",
		},
	}

	svc := NewEmailService(cfg, zap.NewNop())

	require.True(t, svc.enabled)
	require.NotNil(t, svc.sendEmail)
	require.NotNil(t, svc.client)
}

func TestEmailServiceSendVerificationEmail(t *testing.T) {
	var req *resend.SendEmailRequest
	svc := &EmailService{
		enabled:     true,
		fromAddress: "Nexia <noreply@example.com>",
		appBaseURL:  "https://app.example.com",
		logger:      zap.NewNop(),
		sendEmail: func(r *resend.SendEmailRequest) (*resend.SendEmailResponse, error) {
			req = r
			return &resend.SendEmailResponse{Id: "msg_123"}, nil
		},
	}

	require.NoError(t, svc.SendVerificationEmail("user@example.com", "token with spaces"))
	require.NotNil(t, req)
	require.Equal(t, "Verify your Nexia email address", req.Subject)
	require.Contains(t, req.Html, "token+with+spaces")
}

func TestEmailServiceSendPasswordResetEmailError(t *testing.T) {
	svc := &EmailService{
		enabled:     true,
		fromAddress: "Nexia <noreply@example.com>",
		appBaseURL:  "https://app.example.com",
		logger:      zap.NewNop(),
		sendEmail: func(r *resend.SendEmailRequest) (*resend.SendEmailResponse, error) {
			return nil, errors.New("boom")
		},
	}

	err := svc.SendPasswordResetEmail("user@example.com", "reset-token")
	require.Error(t, err)
	require.Contains(t, err.Error(), "send password reset email")
}

func TestEmailServiceSendPasswordResetEmailSuccess(t *testing.T) {
	var req *resend.SendEmailRequest
	svc := &EmailService{
		enabled:     true,
		fromAddress: "Nexia <noreply@example.com>",
		appBaseURL:  "https://app.example.com",
		logger:      zap.NewNop(),
		sendEmail: func(r *resend.SendEmailRequest) (*resend.SendEmailResponse, error) {
			req = r
			return &resend.SendEmailResponse{Id: "msg_456"}, nil
		},
	}

	require.NoError(t, svc.SendPasswordResetEmail("user@example.com", "reset-token"))
	require.NotNil(t, req)
	require.Equal(t, "Reset your Nexia password", req.Subject)
	require.Contains(t, req.Html, "reset-token")
}

func TestEmailTemplatesIncludeExpectedFields(t *testing.T) {
	verifyHTML := buildVerificationEmailHTML("https://app.example.com/verify?token=abc")
	require.Contains(t, verifyHTML, "Verify Email Address")
	require.Contains(t, verifyHTML, "https://app.example.com/verify?token=abc")

	resetHTML := buildPasswordResetEmailHTML("reset-token", "https://app.example.com/reset-password")
	require.Contains(t, resetHTML, "reset-token")
	require.Contains(t, resetHTML, "Reset Password")
}
