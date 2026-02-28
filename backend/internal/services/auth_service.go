package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"nexia-backend/internal/config"
	"nexia-backend/internal/models"
	"nexia-backend/internal/utils"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

const resetTokenExpiry = 15 * time.Minute

type AuthService struct {
	Repo      UserRepository
	ResetRepo PasswordResetRepository
	Config    *config.Config
}

type UserRepository interface {
	Create(user *models.User) error
	FindByUsername(username string) (*models.User, error)
	UpdatePassword(userID uint64, hashedPassword string) error
}

type PasswordResetRepository interface {
	Create(token *models.PasswordResetToken) error
	FindByToken(token string) (*models.PasswordResetToken, error)
	MarkAsUsed(id uint64) error
}

func NewAuthService(repo UserRepository, resetRepo PasswordResetRepository, cfg *config.Config) *AuthService {
	return &AuthService{Repo: repo, ResetRepo: resetRepo, Config: cfg}
}

func (s *AuthService) LoginOrSignup(username, password string) (string, error) {
	user, err := s.Repo.FindByUsername(username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Signup
			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
			if err != nil {
				return "", err
			}
			newUser := &models.User{
				Username: username,
				Password: string(hashedPassword),
			}
			if err := s.Repo.Create(newUser); err != nil {
				return "", err
			}
			return utils.GenerateToken(newUser.ID, s.Config)
		}
		return "", err
	}

	// Login
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return "", ErrUnauthorized
	}

	return utils.GenerateToken(user.ID, s.Config)
}

// ForgotPassword generates a time-limited reset token for the given username.
// The token is returned to the caller so the frontend can display it to the user.
func (s *AuthService) ForgotPassword(username string) (string, error) {
	user, err := s.Repo.FindByUsername(username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", ErrNotFound
		}
		return "", err
	}

	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	tokenStr := hex.EncodeToString(raw)

	record := &models.PasswordResetToken{
		UserID:    user.ID,
		Token:     tokenStr,
		ExpiresAt: time.Now().Add(resetTokenExpiry),
	}
	if err := s.ResetRepo.Create(record); err != nil {
		return "", err
	}

	return tokenStr, nil
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
