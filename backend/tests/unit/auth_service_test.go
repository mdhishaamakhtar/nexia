package unit_test

import (
	"errors"
	"testing"

	"nexia-backend/internal/config"
	"nexia-backend/internal/models"
	"nexia-backend/internal/services"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type fakeUserRepo struct {
	user     *models.User
	createFn func(*models.User) error
	findErr  error
}

func (f *fakeUserRepo) Create(user *models.User) error {
	if f.createFn != nil {
		return f.createFn(user)
	}
	user.ID = 42
	f.user = user
	return nil
}

func (f *fakeUserRepo) FindByUsername(username string) (*models.User, error) {
	if f.findErr != nil {
		return nil, f.findErr
	}
	if f.user == nil || f.user.Username != username {
		return nil, gorm.ErrRecordNotFound
	}
	return f.user, nil
}

func newAuthService(repo *fakeUserRepo) *services.AuthService {
	return services.NewAuthService(repo, &config.Config{Server: config.ServerConfig{JWTSecret: "test-secret", JWTExpiryMinutes: 60}})
}

func TestAuthServiceSignup(t *testing.T) {
	repo := &fakeUserRepo{}
	svc := newAuthService(repo)

	token, err := svc.LoginOrSignup("newuser", "password123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty token")
	}
	if repo.user == nil || repo.user.Password == "password123" {
		t.Fatal("expected hashed password to be stored")
	}
}

func TestAuthServiceInvalidCredentials(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("validpass"), bcrypt.DefaultCost)
	repo := &fakeUserRepo{user: &models.User{ID: 7, Username: "existing", Password: string(hash)}}
	svc := newAuthService(repo)

	_, err := svc.LoginOrSignup("existing", "wrongpass")
	if !errors.Is(err, services.ErrUnauthorized) {
		t.Fatalf("expected ErrUnauthorized, got %v", err)
	}
}

func TestAuthServiceLoginSuccess(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("validpass"), bcrypt.DefaultCost)
	repo := &fakeUserRepo{user: &models.User{ID: 9, Username: "existing", Password: string(hash)}}
	svc := newAuthService(repo)

	token, err := svc.LoginOrSignup("existing", "validpass")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token == "" {
		t.Fatal("expected token")
	}
}

func TestAuthServiceRepoErrors(t *testing.T) {
	repoErr := errors.New("repo failed")
	repo := &fakeUserRepo{findErr: repoErr}
	svc := newAuthService(repo)

	_, err := svc.LoginOrSignup("any", "pass")
	if !errors.Is(err, repoErr) {
		t.Fatalf("expected repo error, got %v", err)
	}
}
