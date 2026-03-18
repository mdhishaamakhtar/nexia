package email

import (
	"errors"
	"strings"
	"testing"

	"nexia-backend/internal/config"

	resend "github.com/resend/resend-go/v2"
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

	if svc.enabled {
		t.Fatal("expected email service to be disabled")
	}
	if svc.sendEmail != nil {
		t.Fatal("expected sendEmail func to be nil when disabled")
	}

	if err := svc.SendVerificationEmail("user@example.com", "token"); err != nil {
		t.Fatalf("disabled verification email should be skipped: %v", err)
	}
	if err := svc.SendPasswordResetEmail("user@example.com", "token"); err != nil {
		t.Fatalf("disabled password reset email should be skipped: %v", err)
	}
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

	if !svc.enabled || svc.sendEmail == nil || svc.client == nil {
		t.Fatalf("expected enabled email service, got %+v", svc)
	}
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

	if err := svc.SendVerificationEmail("user@example.com", "token with spaces"); err != nil {
		t.Fatalf("SendVerificationEmail returned error: %v", err)
	}
	if req == nil {
		t.Fatal("expected resend request")
	}
	if req.Subject != "Verify your Nexia email address" {
		t.Fatalf("unexpected subject %q", req.Subject)
	}
	if !strings.Contains(req.Html, "token+with+spaces") {
		t.Fatalf("expected escaped token in html: %s", req.Html)
	}
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
	if err == nil || !strings.Contains(err.Error(), "send password reset email") {
		t.Fatalf("expected wrapped resend error, got %v", err)
	}
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

	if err := svc.SendPasswordResetEmail("user@example.com", "reset-token"); err != nil {
		t.Fatalf("SendPasswordResetEmail returned error: %v", err)
	}
	if req == nil || req.Subject != "Reset your Nexia password" || !strings.Contains(req.Html, "reset-token") {
		t.Fatalf("unexpected request %+v", req)
	}
}

func TestEmailTemplatesIncludeExpectedFields(t *testing.T) {
	verifyHTML := buildVerificationEmailHTML("https://app.example.com/verify?token=abc")
	if !strings.Contains(verifyHTML, "Verify Email Address") || !strings.Contains(verifyHTML, "https://app.example.com/verify?token=abc") {
		t.Fatalf("verification template missing expected content: %s", verifyHTML)
	}

	resetHTML := buildPasswordResetEmailHTML("reset-token", "https://app.example.com/reset-password")
	if !strings.Contains(resetHTML, "reset-token") || !strings.Contains(resetHTML, "Reset Password") {
		t.Fatalf("reset template missing expected content: %s", resetHTML)
	}
}
