package email

import (
	"fmt"
	"log"
	"net/url"

	"nexia-backend/internal/config"

	resend "github.com/resend/resend-go/v2"
)

type EmailService struct {
	client      *resend.Client
	fromAddress string
	appBaseURL  string
	enabled     bool
}

func NewEmailService(cfg *config.Config) *EmailService {
	if cfg.Email.ResendAPIKey == "" {
		log.Println("Warning: Email service disabled — NEXIA_EMAIL_RESEND_API_KEY not set")
		return &EmailService{enabled: false, fromAddress: cfg.Email.FromAddress, appBaseURL: cfg.Email.AppBaseURL}
	}
	return &EmailService{
		client:      resend.NewClient(cfg.Email.ResendAPIKey),
		fromAddress: cfg.Email.FromAddress,
		appBaseURL:  cfg.Email.AppBaseURL,
		enabled:     true,
	}
}

func (e *EmailService) SendVerificationEmail(toEmail, token string) error {
	verifyURL := fmt.Sprintf("%s/verify-email/confirm?token=%s", e.appBaseURL, url.QueryEscape(token))

	if !e.enabled {
		log.Printf("[email disabled] Would send verification email to %s — verifyURL: %s", toEmail, verifyURL)
		return nil
	}

	params := &resend.SendEmailRequest{
		From:    e.fromAddress,
		To:      []string{toEmail},
		Subject: "Verify your Nexia email address",
		Html:    buildVerificationEmailHTML(verifyURL),
	}

	_, err := e.client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("resend: send verification email: %w", err)
	}
	return nil
}

func (e *EmailService) SendPasswordResetEmail(toEmail, token string) error {
	resetURL := fmt.Sprintf("%s/reset-password", e.appBaseURL)

	if !e.enabled {
		log.Printf("[email disabled] Would send password reset email to %s — resetURL: %s", toEmail, resetURL)
		return nil
	}

	params := &resend.SendEmailRequest{
		From:    e.fromAddress,
		To:      []string{toEmail},
		Subject: "Reset your Nexia password",
		Html:    buildPasswordResetEmailHTML(token, resetURL),
	}

	_, err := e.client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("resend: send password reset email: %w", err)
	}
	return nil
}
