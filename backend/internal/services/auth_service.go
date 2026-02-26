package services

import (
	"errors"

	"nexia-backend/internal/config"
	"nexia-backend/internal/models"
	"nexia-backend/internal/utils"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	Repo   UserRepository
	Config *config.Config
}

type UserRepository interface {
	Create(user *models.User) error
	FindByUsername(username string) (*models.User, error)
}

func NewAuthService(repo UserRepository, cfg *config.Config) *AuthService {
	return &AuthService{Repo: repo, Config: cfg}
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
