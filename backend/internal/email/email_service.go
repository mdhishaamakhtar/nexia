package email

import (
	"fmt"
	"net/url"

	"nexia-backend/internal/config"

	resend "github.com/resend/resend-go/v2"
	"go.uber.org/zap"
)

type EmailService struct {
	client      *resend.Client
	fromAddress string
	appBaseURL  string
	enabled     bool
	logger      *zap.Logger
	sendEmail   func(*resend.SendEmailRequest) (*resend.SendEmailResponse, error)
}

func NewEmailService(cfg *config.Config, logger *zap.Logger) *EmailService {
	if cfg.Email.ResendAPIKey == "" {
		logger.Warn("email service disabled: missing resend api key")
		return &EmailService{
			enabled:     false,
			fromAddress: cfg.Email.FromAddress,
			appBaseURL:  cfg.Email.AppBaseURL,
			logger:      logger.Named("email"),
		}
	}
	client := resend.NewClient(cfg.Email.ResendAPIKey)
	return &EmailService{
		client:      client,
		fromAddress: cfg.Email.FromAddress,
		appBaseURL:  cfg.Email.AppBaseURL,
		enabled:     true,
		logger:      logger.Named("email"),
		sendEmail:   client.Emails.Send,
	}
}

func (e *EmailService) SendVerificationEmail(toEmail, token string) error {
	verifyURL := fmt.Sprintf("%s/verify-email/confirm?token=%s", e.appBaseURL, url.QueryEscape(token))

	if !e.enabled {
		e.logger.Info("email send skipped: verification email",
			zap.String("to_email", toEmail),
			zap.String("verify_url", verifyURL),
		)
		return nil
	}

	params := &resend.SendEmailRequest{
		From:    e.fromAddress,
		To:      []string{toEmail},
		Subject: "Verify your Nexia email address",
		Html:    buildVerificationEmailHTML(verifyURL),
	}

	_, err := e.sendEmail(params)
	if err != nil {
		return fmt.Errorf("resend: send verification email: %w", err)
	}
	e.logger.Info("verification email sent", zap.String("to_email", toEmail))
	return nil
}

func (e *EmailService) SendPasswordResetEmail(toEmail, token string) error {
	resetURL := fmt.Sprintf("%s/reset-password", e.appBaseURL)

	if !e.enabled {
		e.logger.Info("email send skipped: password reset email",
			zap.String("to_email", toEmail),
			zap.String("reset_url", resetURL),
		)
		return nil
	}

	params := &resend.SendEmailRequest{
		From:    e.fromAddress,
		To:      []string{toEmail},
		Subject: "Reset your Nexia password",
		Html:    buildPasswordResetEmailHTML(token, resetURL),
	}

	_, err := e.sendEmail(params)
	if err != nil {
		return fmt.Errorf("resend: send password reset email: %w", err)
	}
	e.logger.Info("password reset email sent", zap.String("to_email", toEmail))
	return nil
}
