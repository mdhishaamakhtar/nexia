package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"net/mail"
	"time"

	"nexia-backend/internal/config"
	"nexia-backend/internal/models"
	"nexia-backend/internal/utils"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const resetTokenExpiry = 15 * time.Minute
const verifyTokenExpiry = 24 * time.Hour

type AuthService struct {
	Repo       UserRepository
	ResetRepo  PasswordResetRepository
	VerifyRepo EmailVerificationRepository
	EmailSvc   EmailSender
	Config     *config.Config
}

type UserRepository interface {
	Create(user *models.User) error
	FindByEmail(email string) (*models.User, error)
	FindByID(id uint64) (*models.User, error)
	UpdatePassword(userID uint64, hashedPassword string) error
	UpdateEmailVerified(userID uint64) error
}

type PasswordResetRepository interface {
	Create(token *models.PasswordResetToken) error
	FindByToken(token string) (*models.PasswordResetToken, error)
	MarkAsUsed(id uint64) error
}

type EmailVerificationRepository interface {
	Create(token *models.EmailVerificationToken) error
	FindByToken(token string) (*models.EmailVerificationToken, error)
	MarkAsUsed(id uint64) error
}

type EmailSender interface {
	SendVerificationEmail(toEmail, token string) error
	SendPasswordResetEmail(toEmail, token string) error
}

func NewAuthService(repo UserRepository, resetRepo PasswordResetRepository, verifyRepo EmailVerificationRepository, emailSvc EmailSender, cfg *config.Config) *AuthService {
	return &AuthService{
		Repo:       repo,
		ResetRepo:  resetRepo,
		VerifyRepo: verifyRepo,
		EmailSvc:   emailSvc,
		Config:     cfg,
	}
}

// Signup creates a new user account and sends a verification email.
func (s *AuthService) Signup(email, password string) error {
	if _, err := mail.ParseAddress(email); err != nil {
		return ErrValidation
	}
	if len(password) < 6 {
		return ErrValidation
	}

	_, err := s.Repo.FindByEmail(email)
	if err == nil {
		return ErrEmailConflict
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	newUser := &models.User{
		Email:         email,
		Password:      string(hashedPassword),
		EmailVerified: false,
	}
	if err := s.Repo.Create(newUser); err != nil {
		return err
	}

	tokenStr, err := generateToken()
	if err != nil {
		return err
	}

	record := &models.EmailVerificationToken{
		UserID:    newUser.ID,
		Token:     tokenStr,
		ExpiresAt: time.Now().Add(verifyTokenExpiry),
	}
	if err := s.VerifyRepo.Create(record); err != nil {
		return err
	}

	// Best-effort: log error but don't fail signup
	if err := s.EmailSvc.SendVerificationEmail(email, tokenStr); err != nil {
		_ = err
	}

	return nil
}

// Login authenticates a user and returns a JWT token.
func (s *AuthService) Login(email, password string) (string, error) {
	user, err := s.Repo.FindByEmail(email)
	if err != nil {
		// Don't reveal whether email exists
		return "", ErrUnauthorized
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return "", ErrUnauthorized
	}

	if !user.EmailVerified {
		return "", ErrEmailNotVerified
	}

	return utils.GenerateToken(user.ID, s.Config)
}

// VerifyEmail marks the email as verified for the token's owner.
func (s *AuthService) VerifyEmail(token string) error {
	record, err := s.VerifyRepo.FindByToken(token)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		return err
	}

	if record.Used || time.Now().After(record.ExpiresAt) {
		return ErrNotFound
	}

	if err := s.Repo.UpdateEmailVerified(record.UserID); err != nil {
		return err
	}

	return s.VerifyRepo.MarkAsUsed(record.ID)
}

// ForgotPassword sends a password reset email if the account exists.
// Always returns nil to prevent email enumeration.
func (s *AuthService) ForgotPassword(email string) error {
	user, err := s.Repo.FindByEmail(email)
	if err != nil {
		// Silent — don't reveal whether email exists
		return nil
	}

	tokenStr, err := generateToken()
	if err != nil {
		return err
	}

	record := &models.PasswordResetToken{
		UserID:    user.ID,
		Token:     tokenStr,
		ExpiresAt: time.Now().Add(resetTokenExpiry),
	}
	if err := s.ResetRepo.Create(record); err != nil {
		return err
	}

	if err := s.EmailSvc.SendPasswordResetEmail(email, tokenStr); err != nil {
		_ = err
	}

	return nil
}

// ResetPassword validates the reset token and updates the user's password.
func (s *AuthService) ResetPassword(token, newPassword string) error {
	if len(newPassword) < 6 {
		return ErrValidation
	}

	record, err := s.ResetRepo.FindByToken(token)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		return err
	}

	if record.Used {
		return ErrNotFound
	}
	if time.Now().After(record.ExpiresAt) {
		return ErrNotFound
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if err := s.Repo.UpdatePassword(record.UserID, string(hashed)); err != nil {
		return err
	}

	return s.ResetRepo.MarkAsUsed(record.ID)
}

func generateToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return hex.EncodeToString(raw), nil
}
