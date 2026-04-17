package services_test

import (
	"errors"
	"testing"
	"time"

	"nexia-backend/internal/config"
	"nexia-backend/internal/models"
	"nexia-backend/internal/services"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

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

func TestSignupSuccess(t *testing.T) {
	repo := &fakeUserRepo{}
	emailSvc := &fakeEmailSvc{}
	svc := newAuthService(repo, &fakeResetRepo{}, &fakeVerifyRepo{}, emailSvc)

	err := svc.Signup("alice@example.com", "password123")
	require.NoError(t, err)
	require.NotNil(t, repo.user)
	require.NotEqual(t, "password123", repo.user.Password)
	require.False(t, repo.user.EmailVerified)
	require.Len(t, emailSvc.sentVerification, 1)
}

func TestSignupEmailConflict(t *testing.T) {
	repo := &fakeUserRepo{user: &models.User{ID: 1, Email: "alice@example.com", Password: "hash"}}
	svc := newAuthServiceDefaults(repo)

	err := svc.Signup("alice@example.com", "password123")
	require.ErrorIs(t, err, services.ErrEmailConflict)
}

func TestSignupValidationErrorBadEmail(t *testing.T) {
	svc := newAuthServiceDefaults(&fakeUserRepo{})
	err := svc.Signup("not-an-email", "password123")
	require.ErrorIs(t, err, services.ErrValidation)
}

func TestSignupValidationErrorShortPassword(t *testing.T) {
	svc := newAuthServiceDefaults(&fakeUserRepo{})
	err := svc.Signup("alice@example.com", "abc")
	require.ErrorIs(t, err, services.ErrValidation)
}

func TestLoginSuccess(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("validpass"), bcrypt.DefaultCost)
	require.NoError(t, err)

	repo := &fakeUserRepo{user: &models.User{ID: 9, Email: "alice@example.com", Password: string(hash), EmailVerified: true}}
	svc := newAuthServiceDefaults(repo)

	token, err := svc.Login("alice@example.com", "validpass")
	require.NoError(t, err)
	require.NotEmpty(t, token)
}

func TestLoginEmailNotVerified(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("validpass"), bcrypt.DefaultCost)
	require.NoError(t, err)

	repo := &fakeUserRepo{user: &models.User{ID: 9, Email: "alice@example.com", Password: string(hash), EmailVerified: false}}
	svc := newAuthServiceDefaults(repo)

	_, err = svc.Login("alice@example.com", "validpass")
	require.ErrorIs(t, err, services.ErrEmailNotVerified)
}

func TestLoginWrongPassword(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("validpass"), bcrypt.DefaultCost)
	require.NoError(t, err)

	repo := &fakeUserRepo{user: &models.User{ID: 9, Email: "alice@example.com", Password: string(hash), EmailVerified: true}}
	svc := newAuthServiceDefaults(repo)

	_, err = svc.Login("alice@example.com", "wrongpass")
	require.ErrorIs(t, err, services.ErrUnauthorized)
}

func TestLoginUserNotFound(t *testing.T) {
	svc := newAuthServiceDefaults(&fakeUserRepo{})
	_, err := svc.Login("nobody@example.com", "pass")
	require.ErrorIs(t, err, services.ErrAccountNotFound)
}

func TestVerifyEmailSuccess(t *testing.T) {
	stored := &models.EmailVerificationToken{
		ID:        1,
		UserID:    5,
		Token:     "validtoken",
		ExpiresAt: time.Now().Add(time.Hour),
		Used:      false,
	}
	userRepo := &fakeUserRepo{user: &models.User{ID: 5}}
	verifyRepo := &fakeVerifyRepo{stored: stored}
	svc := newAuthService(userRepo, &fakeResetRepo{}, verifyRepo, &fakeEmailSvc{})

	err := svc.VerifyEmail("validtoken")
	require.NoError(t, err)
	require.Equal(t, uint64(5), userRepo.emailVerifiedUserID)
	require.Equal(t, uint64(1), verifyRepo.markedID)
}

func TestVerifyEmailExpired(t *testing.T) {
	stored := &models.EmailVerificationToken{
		ID:        1,
		Token:     "expiredtoken",
		ExpiresAt: time.Now().Add(-time.Hour),
		Used:      false,
	}
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{}, &fakeVerifyRepo{stored: stored}, &fakeEmailSvc{})

	err := svc.VerifyEmail("expiredtoken")
	require.ErrorIs(t, err, services.ErrNotFound)
}

func TestVerifyEmailAlreadyUsed(t *testing.T) {
	stored := &models.EmailVerificationToken{
		ID:        1,
		Token:     "usedtoken",
		ExpiresAt: time.Now().Add(time.Hour),
		Used:      true,
	}
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{}, &fakeVerifyRepo{stored: stored}, &fakeEmailSvc{})

	err := svc.VerifyEmail("usedtoken")
	require.ErrorIs(t, err, services.ErrNotFound)
}

func TestForgotPasswordSendsEmail(t *testing.T) {
	repo := &fakeUserRepo{user: &models.User{ID: 1, Email: "alice@example.com", Password: "hash"}}
	resetRepo := &fakeResetRepo{}
	emailSvc := &fakeEmailSvc{}
	svc := newAuthService(repo, resetRepo, &fakeVerifyRepo{}, emailSvc)

	err := svc.ForgotPassword("alice@example.com")
	require.NoError(t, err)
	require.NotNil(t, resetRepo.stored)
	require.False(t, resetRepo.stored.Used)
	require.True(t, resetRepo.stored.ExpiresAt.After(time.Now()))
	require.Len(t, emailSvc.sentReset, 1)
}

func TestForgotPasswordUserNotFound(t *testing.T) {
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{}, &fakeVerifyRepo{}, &fakeEmailSvc{})
	require.NoError(t, svc.ForgotPassword("nobody@example.com"))
}

func TestForgotPasswordFindEmailGenericError(t *testing.T) {
	dbErr := errors.New("db unavailable")
	repo := &fakeUserRepo{findErr: dbErr}
	svc := newAuthService(repo, &fakeResetRepo{}, &fakeVerifyRepo{}, &fakeEmailSvc{})

	err := svc.ForgotPassword("alice@example.com")
	require.ErrorIs(t, err, dbErr)
}

func TestSignupEmailSendErrorDoesNotFail(t *testing.T) {
	repo := &fakeUserRepo{}
	emailSvc := &fakeEmailSvc{sendErr: errors.New("smtp down")}
	svc := newAuthService(repo, &fakeResetRepo{}, &fakeVerifyRepo{}, emailSvc)

	require.NoError(t, svc.Signup("alice@example.com", "password123"))
}

func TestForgotPasswordEmailSendErrorDoesNotFail(t *testing.T) {
	repo := &fakeUserRepo{user: &models.User{ID: 1, Email: "alice@example.com", Password: "hash"}}
	emailSvc := &fakeEmailSvc{sendErr: errors.New("smtp down")}
	svc := newAuthService(repo, &fakeResetRepo{}, &fakeVerifyRepo{}, emailSvc)

	require.NoError(t, svc.ForgotPassword("alice@example.com"))
}

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
	require.NoError(t, err)
	require.NotEmpty(t, userRepo.updatedPassword)
	require.Equal(t, stored.ID, resetRepo.markedID)
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(userRepo.updatedPassword), []byte("newpassword123")))
}

func TestResetPasswordTokenNotFound(t *testing.T) {
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{}, &fakeVerifyRepo{}, &fakeEmailSvc{})
	err := svc.ResetPassword("nosuchtoken", "newpass123")
	require.ErrorIs(t, err, services.ErrNotFound)
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
	require.ErrorIs(t, err, services.ErrNotFound)
}

func TestResetPasswordTokenExpired(t *testing.T) {
	stored := &models.PasswordResetToken{
		ID:        3,
		Token:     "expiredtoken",
		ExpiresAt: time.Now().Add(-time.Minute),
		Used:      false,
	}
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{stored: stored}, &fakeVerifyRepo{}, &fakeEmailSvc{})

	err := svc.ResetPassword("expiredtoken", "newpass123")
	require.ErrorIs(t, err, services.ErrNotFound)
}

func TestResetPasswordTooShort(t *testing.T) {
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{}, &fakeVerifyRepo{}, &fakeEmailSvc{})
	err := svc.ResetPassword("anytoken", "abc")
	require.ErrorIs(t, err, services.ErrValidation)
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
	require.ErrorIs(t, err, updateErr)
}

func TestSignupFindEmailGenericError(t *testing.T) {
	dbErr := errors.New("connection timeout")
	repo := &fakeUserRepo{findErr: dbErr}
	svc := newAuthServiceDefaults(repo)

	err := svc.Signup("alice@example.com", "password123")
	require.ErrorIs(t, err, dbErr)
}

func TestSignupVerifyRepoError(t *testing.T) {
	repoErr := errors.New("verify repo failed")
	repo := &fakeUserRepo{}
	verifyRepo := &fakeVerifyRepo{createErr: repoErr}
	svc := newAuthService(repo, &fakeResetRepo{}, verifyRepo, &fakeEmailSvc{})

	err := svc.Signup("alice@example.com", "password123")
	require.ErrorIs(t, err, repoErr)
}

func TestVerifyEmailFindTokenGenericError(t *testing.T) {
	dbErr := errors.New("db read failed")
	verifyRepo := &fakeVerifyRepo{findErr: dbErr}
	svc := newAuthService(&fakeUserRepo{}, &fakeResetRepo{}, verifyRepo, &fakeEmailSvc{})

	err := svc.VerifyEmail("anytoken")
	require.ErrorIs(t, err, dbErr)
}

func TestForgotPasswordResetRepoError(t *testing.T) {
	repoErr := errors.New("reset repo failed")
	userRepo := &fakeUserRepo{user: &models.User{ID: 1, Email: "alice@example.com"}}
	resetRepo := &fakeResetRepo{createErr: repoErr}
	svc := newAuthService(userRepo, resetRepo, &fakeVerifyRepo{}, &fakeEmailSvc{})

	err := svc.ForgotPassword("alice@example.com")
	require.ErrorIs(t, err, repoErr)
}
