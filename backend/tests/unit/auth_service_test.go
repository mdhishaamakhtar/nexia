package unit_test

import (
	"errors"
	"testing"
	"time"

	"nexia-backend/internal/config"
	"nexia-backend/internal/models"
	"nexia-backend/internal/services"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// ── fakes ──────────────────────────────────────────────────────────────────

type fakeUserRepo struct {
	user             *models.User
	createFn         func(*models.User) error
	findErr          error
	updatedPassword  string
	updatePasswordFn func(uint64, string) error
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

func (f *fakeUserRepo) UpdatePassword(userID uint64, hashedPassword string) error {
	if f.updatePasswordFn != nil {
		return f.updatePasswordFn(userID, hashedPassword)
	}
	f.updatedPassword = hashedPassword
	return nil
}

type fakeResetRepo struct {
	stored    *models.PasswordResetToken
	createErr error
	findErr   error
	markErr   error
	markedID  uint64
}

func (f *fakeResetRepo) Create(t *models.PasswordResetToken) error {
	if f.createErr != nil {
		return f.createErr
	}
	t.ID = 1
	f.stored = t
	return nil
}

func (f *fakeResetRepo) FindByToken(token string) (*models.PasswordResetToken, error) {
	if f.findErr != nil {
		return nil, f.findErr
	}
	if f.stored == nil || f.stored.Token != token {
		return nil, gorm.ErrRecordNotFound
	}
	return f.stored, nil
}

func (f *fakeResetRepo) MarkAsUsed(id uint64) error {
	if f.markErr != nil {
		return f.markErr
	}
	f.markedID = id
	return nil
}

// ── helpers ────────────────────────────────────────────────────────────────

func newAuthService(userRepo *fakeUserRepo, resetRepo *fakeResetRepo) *services.AuthService {
	return services.NewAuthService(
		userRepo,
		resetRepo,
		&config.Config{Server: config.ServerConfig{JWTSecret: "test-secret", JWTExpiryMinutes: 60}},
	)
}

func newAuthServiceDefaults(userRepo *fakeUserRepo) *services.AuthService {
	return newAuthService(userRepo, &fakeResetRepo{})
}

// ── LoginOrSignup tests ────────────────────────────────────────────────────

func TestAuthServiceSignup(t *testing.T) {
	repo := &fakeUserRepo{}
	svc := newAuthServiceDefaults(repo)

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
	svc := newAuthServiceDefaults(repo)

	_, err := svc.LoginOrSignup("existing", "wrongpass")
	if !errors.Is(err, services.ErrUnauthorized) {
		t.Fatalf("expected ErrUnauthorized, got %v", err)
	}
}

func TestAuthServiceLoginSuccess(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("validpass"), bcrypt.DefaultCost)
	repo := &fakeUserRepo{user: &models.User{ID: 9, Username: "existing", Password: string(hash)}}
	svc := newAuthServiceDefaults(repo)

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
	svc := newAuthServiceDefaults(repo)

	_, err := svc.LoginOrSignup("any", "pass")
	if !errors.Is(err, repoErr) {
		t.Fatalf("expected repo error, got %v", err)
	}
}

// ── ForgotPassword tests ───────────────────────────────────────────────────

func TestForgotPasswordSuccess(t *testing.T) {
	repo := &fakeUserRepo{user: &models.User{ID: 1, Username: "alice", Password: "hash"}}
	resetRepo := &fakeResetRepo{}
	svc := newAuthService(repo, resetRepo)

	token, err := svc.ForgotPassword("alice")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token == "" {
		t.Fatal("expected a reset token")
	}
	if resetRepo.stored == nil {
		t.Fatal("expected token to be stored")
	}
	if resetRepo.stored.Token != token {
		t.Fatal("stored token does not match returned token")
	}
	if resetRepo.stored.Used {
		t.Fatal("new token should not be marked used")
	}
	if !resetRepo.stored.ExpiresAt.After(time.Now()) {
		t.Fatal("token should expire in the future")
	}
}

func TestForgotPasswordUserNotFound(t *testing.T) {
	repo := &fakeUserRepo{}
	svc := newAuthService(repo, &fakeResetRepo{})

	_, err := svc.ForgotPassword("nobody")
	if !errors.Is(err, services.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestForgotPasswordRepoError(t *testing.T) {
	repo := &fakeUserRepo{findErr: errors.New("db down")}
	svc := newAuthService(repo, &fakeResetRepo{})

	_, err := svc.ForgotPassword("alice")
	if err == nil {
		t.Fatal("expected error from repo")
	}
}

// ── ResetPassword tests ────────────────────────────────────────────────────

func TestResetPasswordSuccess(t *testing.T) {
	stored := &models.PasswordResetToken{
		ID:        1,
		UserID:    5,
		Token:     "validtoken",
		ExpiresAt: time.Now().Add(10 * time.Minute),
		Used:      false,
	}
	userRepo := &fakeUserRepo{}
	resetRepo := &fakeResetRepo{stored: stored}
	svc := newAuthService(userRepo, resetRepo)

	err := svc.ResetPassword("validtoken", "newpassword123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if userRepo.updatedPassword == "" {
		t.Fatal("expected password to be updated")
	}
	if resetRepo.markedID != stored.ID {
		t.Fatal("expected token to be marked as used")
	}
	// Verify the stored password is hashed, not plaintext
	if err := bcrypt.CompareHashAndPassword([]byte(userRepo.updatedPassword), []byte("newpassword123")); err != nil {
		t.Fatal("stored password is not a valid bcrypt hash of the new password")
	}
}

func TestResetPasswordTokenNotFound(t *testing.T) {
	resetRepo := &fakeResetRepo{}
	svc := newAuthService(&fakeUserRepo{}, resetRepo)

	err := svc.ResetPassword("nosuchtoken", "newpass123")
	if !errors.Is(err, services.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestResetPasswordTokenAlreadyUsed(t *testing.T) {
	stored := &models.PasswordResetToken{
		ID:        2,
		Token:     "usedtoken",
		ExpiresAt: time.Now().Add(10 * time.Minute),
		Used:      true,
	}
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{stored: stored})

	err := svc.ResetPassword("usedtoken", "newpass123")
	if !errors.Is(err, services.ErrNotFound) {
		t.Fatalf("expected ErrNotFound for used token, got %v", err)
	}
}

func TestResetPasswordTokenExpired(t *testing.T) {
	stored := &models.PasswordResetToken{
		ID:        3,
		Token:     "expiredtoken",
		ExpiresAt: time.Now().Add(-1 * time.Minute),
		Used:      false,
	}
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{stored: stored})

	err := svc.ResetPassword("expiredtoken", "newpass123")
	if !errors.Is(err, services.ErrNotFound) {
		t.Fatalf("expected ErrNotFound for expired token, got %v", err)
	}
}

func TestResetPasswordTooShort(t *testing.T) {
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{})

	err := svc.ResetPassword("anytoken", "abc")
	if !errors.Is(err, services.ErrValidation) {
		t.Fatalf("expected ErrValidation, got %v", err)
	}
}
