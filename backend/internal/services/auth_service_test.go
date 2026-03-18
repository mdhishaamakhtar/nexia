package services_test

import (
	"errors"
	"testing"
	"time"

	"nexia-backend/internal/config"
	"nexia-backend/internal/models"
	"nexia-backend/internal/services"

	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// ── fakes ──────────────────────────────────────────────────────────────────

type fakeUserRepo struct {
	user                *models.User
	createFn            func(*models.User) error
	findErr             error
	updatedPassword     string
	updatePasswordFn    func(uint64, string) error
	emailVerifiedUserID uint64
}

func (f *fakeUserRepo) Create(user *models.User) error {
	if f.createFn != nil {
		return f.createFn(user)
	}
	user.ID = 42
	f.user = user
	return nil
}

func (f *fakeUserRepo) FindByEmail(email string) (*models.User, error) {
	if f.findErr != nil {
		return nil, f.findErr
	}
	if f.user == nil || f.user.Email != email {
		return nil, gorm.ErrRecordNotFound
	}
	return f.user, nil
}

func (f *fakeUserRepo) FindByID(id uint64) (*models.User, error) {
	if f.user == nil || f.user.ID != id {
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

func (f *fakeUserRepo) UpdateEmailVerified(userID uint64) error {
	f.emailVerifiedUserID = userID
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

type fakeVerifyRepo struct {
	stored    *models.EmailVerificationToken
	createErr error
	findErr   error
	markErr   error
	markedID  uint64
}

func (f *fakeVerifyRepo) Create(t *models.EmailVerificationToken) error {
	if f.createErr != nil {
		return f.createErr
	}
	t.ID = 1
	f.stored = t
	return nil
}

func (f *fakeVerifyRepo) FindByToken(token string) (*models.EmailVerificationToken, error) {
	if f.findErr != nil {
		return nil, f.findErr
	}
	if f.stored == nil || f.stored.Token != token {
		return nil, gorm.ErrRecordNotFound
	}
	return f.stored, nil
}

func (f *fakeVerifyRepo) MarkAsUsed(id uint64) error {
	if f.markErr != nil {
		return f.markErr
	}
	f.markedID = id
	return nil
}

type fakeEmailSvc struct {
	sentVerification []string
	sentReset        []string
	sendErr          error
}

func (f *fakeEmailSvc) SendVerificationEmail(toEmail, token string) error {
	if f.sendErr != nil {
		return f.sendErr
	}
	f.sentVerification = append(f.sentVerification, toEmail)
	return nil
}

func (f *fakeEmailSvc) SendPasswordResetEmail(toEmail, token string) error {
	if f.sendErr != nil {
		return f.sendErr
	}
	f.sentReset = append(f.sentReset, toEmail)
	return nil
}

// ── helpers ────────────────────────────────────────────────────────────────

func newAuthService(userRepo *fakeUserRepo, resetRepo *fakeResetRepo, verifyRepo *fakeVerifyRepo, emailSvc *fakeEmailSvc) *services.AuthService {
	return services.NewAuthService(
		userRepo,
		resetRepo,
		verifyRepo,
		emailSvc,
		&config.Config{Server: config.ServerConfig{JWTSecret: "test-secret", JWTExpiryMinutes: 60}},
		zap.NewNop(),
	)
}

func newAuthServiceDefaults(userRepo *fakeUserRepo) *services.AuthService {
	return newAuthService(userRepo, &fakeResetRepo{}, &fakeVerifyRepo{}, &fakeEmailSvc{})
}

// ── Signup tests ───────────────────────────────────────────────────────────

func TestSignupSuccess(t *testing.T) {
	repo := &fakeUserRepo{}
	emailSvc := &fakeEmailSvc{}
	svc := newAuthService(repo, &fakeResetRepo{}, &fakeVerifyRepo{}, emailSvc)

	err := svc.Signup("alice@example.com", "password123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.user == nil {
		t.Fatal("expected user to be created")
	}
	if repo.user.Password == "password123" {
		t.Fatal("expected password to be hashed")
	}
	if repo.user.EmailVerified {
		t.Fatal("new user should not have email verified")
	}
	if len(emailSvc.sentVerification) != 1 {
		t.Fatal("expected verification email to be sent")
	}
}

func TestSignupEmailConflict(t *testing.T) {
	existing := &models.User{ID: 1, Email: "alice@example.com", Password: "hash"}
	repo := &fakeUserRepo{user: existing}
	svc := newAuthServiceDefaults(repo)

	err := svc.Signup("alice@example.com", "password123")
	if !errors.Is(err, services.ErrEmailConflict) {
		t.Fatalf("expected ErrEmailConflict, got %v", err)
	}
}

func TestSignupValidationErrorBadEmail(t *testing.T) {
	svc := newAuthServiceDefaults(&fakeUserRepo{})

	err := svc.Signup("not-an-email", "password123")
	if !errors.Is(err, services.ErrValidation) {
		t.Fatalf("expected ErrValidation, got %v", err)
	}
}

func TestSignupValidationErrorShortPassword(t *testing.T) {
	svc := newAuthServiceDefaults(&fakeUserRepo{})

	err := svc.Signup("alice@example.com", "abc")
	if !errors.Is(err, services.ErrValidation) {
		t.Fatalf("expected ErrValidation, got %v", err)
	}
}

// ── Login tests ────────────────────────────────────────────────────────────

func TestLoginSuccess(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("validpass"), bcrypt.DefaultCost)
	repo := &fakeUserRepo{user: &models.User{ID: 9, Email: "alice@example.com", Password: string(hash), EmailVerified: true}}
	svc := newAuthServiceDefaults(repo)

	token, err := svc.Login("alice@example.com", "validpass")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty token")
	}
}

func TestLoginEmailNotVerified(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("validpass"), bcrypt.DefaultCost)
	repo := &fakeUserRepo{user: &models.User{ID: 9, Email: "alice@example.com", Password: string(hash), EmailVerified: false}}
	svc := newAuthServiceDefaults(repo)

	_, err := svc.Login("alice@example.com", "validpass")
	if !errors.Is(err, services.ErrEmailNotVerified) {
		t.Fatalf("expected ErrEmailNotVerified, got %v", err)
	}
}

func TestLoginWrongPassword(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("validpass"), bcrypt.DefaultCost)
	repo := &fakeUserRepo{user: &models.User{ID: 9, Email: "alice@example.com", Password: string(hash), EmailVerified: true}}
	svc := newAuthServiceDefaults(repo)

	_, err := svc.Login("alice@example.com", "wrongpass")
	if !errors.Is(err, services.ErrUnauthorized) {
		t.Fatalf("expected ErrUnauthorized, got %v", err)
	}
}

func TestLoginUserNotFound(t *testing.T) {
	repo := &fakeUserRepo{} // no user stored
	svc := newAuthServiceDefaults(repo)

	_, err := svc.Login("nobody@example.com", "pass")
	if !errors.Is(err, services.ErrAccountNotFound) {
		t.Fatalf("expected ErrAccountNotFound, got %v", err)
	}
}

// ── VerifyEmail tests ──────────────────────────────────────────────────────

func TestVerifyEmailSuccess(t *testing.T) {
	stored := &models.EmailVerificationToken{
		ID:        1,
		UserID:    5,
		Token:     "validtoken",
		ExpiresAt: time.Now().Add(1 * time.Hour),
		Used:      false,
	}
	userRepo := &fakeUserRepo{user: &models.User{ID: 5}}
	verifyRepo := &fakeVerifyRepo{stored: stored}
	svc := newAuthService(userRepo, &fakeResetRepo{}, verifyRepo, &fakeEmailSvc{})

	err := svc.VerifyEmail("validtoken")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if userRepo.emailVerifiedUserID != 5 {
		t.Fatal("expected user email to be marked verified")
	}
	if verifyRepo.markedID != 1 {
		t.Fatal("expected token to be marked as used")
	}
}

func TestVerifyEmailExpired(t *testing.T) {
	stored := &models.EmailVerificationToken{
		ID:        1,
		Token:     "expiredtoken",
		ExpiresAt: time.Now().Add(-1 * time.Hour),
		Used:      false,
	}
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{}, &fakeVerifyRepo{stored: stored}, &fakeEmailSvc{})

	err := svc.VerifyEmail("expiredtoken")
	if !errors.Is(err, services.ErrNotFound) {
		t.Fatalf("expected ErrNotFound for expired token, got %v", err)
	}
}

func TestVerifyEmailAlreadyUsed(t *testing.T) {
	stored := &models.EmailVerificationToken{
		ID:        1,
		Token:     "usedtoken",
		ExpiresAt: time.Now().Add(1 * time.Hour),
		Used:      true,
	}
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{}, &fakeVerifyRepo{stored: stored}, &fakeEmailSvc{})

	err := svc.VerifyEmail("usedtoken")
	if !errors.Is(err, services.ErrNotFound) {
		t.Fatalf("expected ErrNotFound for used token, got %v", err)
	}
}

// ── ForgotPassword tests ───────────────────────────────────────────────────

func TestForgotPasswordSendsEmail(t *testing.T) {
	repo := &fakeUserRepo{user: &models.User{ID: 1, Email: "alice@example.com", Password: "hash"}}
	resetRepo := &fakeResetRepo{}
	emailSvc := &fakeEmailSvc{}
	svc := newAuthService(repo, resetRepo, &fakeVerifyRepo{}, emailSvc)

	err := svc.ForgotPassword("alice@example.com")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resetRepo.stored == nil {
		t.Fatal("expected token to be stored")
	}
	if resetRepo.stored.Used {
		t.Fatal("new token should not be marked used")
	}
	if !resetRepo.stored.ExpiresAt.After(time.Now()) {
		t.Fatal("token should expire in the future")
	}
	if len(emailSvc.sentReset) != 1 {
		t.Fatal("expected password reset email to be sent")
	}
}

func TestForgotPasswordUserNotFound(t *testing.T) {
	repo := &fakeUserRepo{} // no user
	svc := newAuthService(repo, &fakeResetRepo{}, &fakeVerifyRepo{}, &fakeEmailSvc{})

	// Should return nil silently (no enumeration)
	err := svc.ForgotPassword("nobody@example.com")
	if err != nil {
		t.Fatalf("expected nil (silent), got %v", err)
	}
}

func TestForgotPasswordFindEmailGenericError(t *testing.T) {
	dbErr := errors.New("db unavailable")
	repo := &fakeUserRepo{findErr: dbErr}
	svc := newAuthService(repo, &fakeResetRepo{}, &fakeVerifyRepo{}, &fakeEmailSvc{})

	err := svc.ForgotPassword("alice@example.com")
	if !errors.Is(err, dbErr) {
		t.Fatalf("expected db error propagated, got %v", err)
	}
}

func TestSignupEmailSendErrorDoesNotFail(t *testing.T) {
	repo := &fakeUserRepo{}
	emailSvc := &fakeEmailSvc{sendErr: errors.New("smtp down")}
	svc := newAuthService(repo, &fakeResetRepo{}, &fakeVerifyRepo{}, emailSvc)

	if err := svc.Signup("alice@example.com", "password123"); err != nil {
		t.Fatalf("expected signup success despite email failure, got %v", err)
	}
}

func TestForgotPasswordEmailSendErrorDoesNotFail(t *testing.T) {
	repo := &fakeUserRepo{user: &models.User{ID: 1, Email: "alice@example.com", Password: "hash"}}
	emailSvc := &fakeEmailSvc{sendErr: errors.New("smtp down")}
	svc := newAuthService(repo, &fakeResetRepo{}, &fakeVerifyRepo{}, emailSvc)

	if err := svc.ForgotPassword("alice@example.com"); err != nil {
		t.Fatalf("expected forgot password success despite email failure, got %v", err)
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
	svc := newAuthService(userRepo, resetRepo, &fakeVerifyRepo{}, &fakeEmailSvc{})

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
	if err := bcrypt.CompareHashAndPassword([]byte(userRepo.updatedPassword), []byte("newpassword123")); err != nil {
		t.Fatal("stored password is not a valid bcrypt hash of the new password")
	}
}

func TestResetPasswordTokenNotFound(t *testing.T) {
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{}, &fakeVerifyRepo{}, &fakeEmailSvc{})

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
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{stored: stored}, &fakeVerifyRepo{}, &fakeEmailSvc{})

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
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{stored: stored}, &fakeVerifyRepo{}, &fakeEmailSvc{})

	err := svc.ResetPassword("expiredtoken", "newpass123")
	if !errors.Is(err, services.ErrNotFound) {
		t.Fatalf("expected ErrNotFound for expired token, got %v", err)
	}
}

func TestResetPasswordTooShort(t *testing.T) {
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{}, &fakeVerifyRepo{}, &fakeEmailSvc{})

	err := svc.ResetPassword("anytoken", "abc")
	if !errors.Is(err, services.ErrValidation) {
		t.Fatalf("expected ErrValidation, got %v", err)
	}
}

func TestResetPasswordUpdatePasswordError(t *testing.T) {
	stored := &models.PasswordResetToken{
		ID:        1,
		UserID:    5,
		Token:     "validtoken",
		ExpiresAt: time.Now().Add(10 * time.Minute),
		Used:      false,
	}
	updateErr := errors.New("db write failed")
	userRepo := &fakeUserRepo{updatePasswordFn: func(userID uint64, h string) error { return updateErr }}
	svc := newAuthService(userRepo, &fakeResetRepo{stored: stored}, &fakeVerifyRepo{}, &fakeEmailSvc{})

	err := svc.ResetPassword("validtoken", "newpass123")
	if !errors.Is(err, updateErr) {
		t.Fatalf("expected updateErr, got %v", err)
	}
}

// ── Signup additional error paths ──────────────────────────────────────────

func TestSignupFindEmailGenericError(t *testing.T) {
	dbErr := errors.New("connection timeout")
	repo := &fakeUserRepo{findErr: dbErr}
	svc := newAuthServiceDefaults(repo)

	err := svc.Signup("alice@example.com", "password123")
	if !errors.Is(err, dbErr) {
		t.Fatalf("expected db error propagated, got %v", err)
	}
}

func TestSignupVerifyRepoError(t *testing.T) {
	repoErr := errors.New("verify repo failed")
	repo := &fakeUserRepo{}
	verifyRepo := &fakeVerifyRepo{createErr: repoErr}
	svc := newAuthService(repo, &fakeResetRepo{}, verifyRepo, &fakeEmailSvc{})

	err := svc.Signup("alice@example.com", "password123")
	if !errors.Is(err, repoErr) {
		t.Fatalf("expected verifyRepo error, got %v", err)
	}
}

// ── VerifyEmail additional error paths ─────────────────────────────────────

func TestVerifyEmailFindTokenGenericError(t *testing.T) {
	dbErr := errors.New("db read failed")
	verifyRepo := &fakeVerifyRepo{findErr: dbErr}
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{}, verifyRepo, &fakeEmailSvc{})

	err := svc.VerifyEmail("anytoken")
	if !errors.Is(err, dbErr) {
		t.Fatalf("expected db error propagated, got %v", err)
	}
}

// ── ForgotPassword additional error paths ──────────────────────────────────

func TestForgotPasswordResetRepoError(t *testing.T) {
	repoErr := errors.New("reset repo failed")
	userRepo := &fakeUserRepo{user: &models.User{ID: 1, Email: "alice@example.com"}}
	resetRepo := &fakeResetRepo{createErr: repoErr}
	svc := newAuthService(userRepo, resetRepo, &fakeVerifyRepo{}, &fakeEmailSvc{})

	err := svc.ForgotPassword("alice@example.com")
	if !errors.Is(err, repoErr) {
		t.Fatalf("expected resetRepo error, got %v", err)
	}
}
