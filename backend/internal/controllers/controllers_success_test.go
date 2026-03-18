package controllers_test

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"nexia-backend/internal/ai"
	"nexia-backend/internal/config"
	"nexia-backend/internal/controllers"
	"nexia-backend/internal/models"
	"nexia-backend/internal/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type authState struct {
	user        *models.User
	resetToken  *models.PasswordResetToken
	verifyToken *models.EmailVerificationToken
}

type authStateUserRepo struct{ state *authState }

func (r *authStateUserRepo) Create(user *models.User) error {
	copied := *user
	copied.ID = 1
	r.state.user = &copied
	user.ID = copied.ID
	return nil
}

func (r *authStateUserRepo) FindByEmail(email string) (*models.User, error) {
	if r.state.user == nil || r.state.user.Email != email {
		return nil, gorm.ErrRecordNotFound
	}
	copied := *r.state.user
	return &copied, nil
}

func (r *authStateUserRepo) FindByID(id uint64) (*models.User, error) {
	if r.state.user == nil || r.state.user.ID != id {
		return nil, gorm.ErrRecordNotFound
	}
	copied := *r.state.user
	return &copied, nil
}

func (r *authStateUserRepo) UpdatePassword(userID uint64, h string) error {
	r.state.user.Password = h
	return nil
}

func (r *authStateUserRepo) UpdateEmailVerified(userID uint64) error {
	r.state.user.EmailVerified = true
	return nil
}

type authStateResetRepo struct{ state *authState }

func (r *authStateResetRepo) Create(t *models.PasswordResetToken) error {
	copied := *t
	copied.ID = 1
	r.state.resetToken = &copied
	t.ID = copied.ID
	return nil
}

func (r *authStateResetRepo) FindByToken(token string) (*models.PasswordResetToken, error) {
	if r.state.resetToken == nil || r.state.resetToken.Token != token {
		return nil, gorm.ErrRecordNotFound
	}
	copied := *r.state.resetToken
	return &copied, nil
}

func (r *authStateResetRepo) MarkAsUsed(id uint64) error {
	r.state.resetToken.Used = true
	return nil
}

type authStateVerifyRepo struct{ state *authState }

func (r *authStateVerifyRepo) Create(t *models.EmailVerificationToken) error {
	copied := *t
	copied.ID = 1
	r.state.verifyToken = &copied
	t.ID = copied.ID
	return nil
}

func (r *authStateVerifyRepo) FindByToken(token string) (*models.EmailVerificationToken, error) {
	if r.state.verifyToken == nil || r.state.verifyToken.Token != token {
		return nil, gorm.ErrRecordNotFound
	}
	copied := *r.state.verifyToken
	return &copied, nil
}

func (r *authStateVerifyRepo) MarkAsUsed(id uint64) error {
	r.state.verifyToken.Used = true
	return nil
}

type noOpEmailSender struct{}

func (noOpEmailSender) SendVerificationEmail(toEmail, token string) error  { return nil }
func (noOpEmailSender) SendPasswordResetEmail(toEmail, token string) error { return nil }

func newSuccessfulAuthController(t *testing.T) (*controllers.AuthController, *authState) {
	t.Helper()
	cfg := &config.Config{Server: config.ServerConfig{JWTSecret: "test-secret", JWTExpiryMinutes: 60}}
	state := &authState{}
	svc := services.NewAuthService(
		&authStateUserRepo{state: state},
		&authStateResetRepo{state: state},
		&authStateVerifyRepo{state: state},
		noOpEmailSender{},
		cfg,
		zap.NewNop(),
	)
	return controllers.NewAuthController(svc, cfg), state
}

func TestAuthControllerSuccessPaths(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl, state := newSuccessfulAuthController(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/signup", bytes.NewBufferString(`{"email":"user@example.com","password":"pass123"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	ctrl.Signup(c)
	if w.Code != http.StatusCreated {
		t.Fatalf("signup expected 201 got %d body=%s", w.Code, w.Body.String())
	}
	if state.verifyToken == nil {
		t.Fatal("expected verification token")
	}

	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/auth/verify-email?token="+state.verifyToken.Token, nil)
	ctrl.VerifyEmail(c)
	if w.Code != http.StatusOK || !state.user.EmailVerified {
		t.Fatalf("verify email failed code=%d verified=%v", w.Code, state.user.EmailVerified)
	}

	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBufferString(`{"email":"user@example.com","password":"pass123"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	ctrl.Login(c)
	if w.Code != http.StatusOK || len(w.Result().Cookies()) == 0 {
		t.Fatalf("login expected cookies and 200, got code=%d", w.Code)
	}

	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/forgot-password", bytes.NewBufferString(`{"email":"user@example.com"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	ctrl.ForgotPassword(c)
	if w.Code != http.StatusOK || state.resetToken == nil {
		t.Fatalf("forgot password failed code=%d token=%+v", w.Code, state.resetToken)
	}

	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/reset-password", bytes.NewBufferString(`{"token":"`+state.resetToken.Token+`","new_password":"newpass123"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	ctrl.ResetPassword(c)
	if w.Code != http.StatusOK || !state.resetToken.Used {
		t.Fatalf("reset password failed code=%d used=%v", w.Code, state.resetToken.Used)
	}

	w = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	ctrl.Logout(c)
	if w.Code != http.StatusOK {
		t.Fatalf("logout expected 200 got %d", w.Code)
	}
}

func TestChatControllerSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := services.NewChatService(staticGemini{}, staticVector{})
	ctrl := controllers.NewChatController(svc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", uint64(7))
	c.Request = httptest.NewRequest(http.MethodPost, "/chat", bytes.NewBufferString(`{"message":"hello"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	ctrl.Chat(c)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
}

type failingVector struct{}

func (failingVector) SearchContext(ctx context.Context, userID uint64, queryEmbedding []float32, limit int) ([]ai.SearchResult, error) {
	return nil, errChatBoom
}

type failingGemini struct{}

func (failingGemini) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	return []float32{0.1}, nil
}

func (failingGemini) GenerateChatResponse(ctx context.Context, systemPrompt string, userMessage string) (string, error) {
	return "", errChatBoom
}

var errChatBoom = gorm.ErrInvalidData

func TestChatControllerServiceError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := services.NewChatService(failingGemini{}, failingVector{})
	ctrl := controllers.NewChatController(svc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", uint64(7))
	c.Request = httptest.NewRequest(http.MethodPost, "/chat", bytes.NewBufferString(`{"message":"hello"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	ctrl.Chat(c)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 got %d body=%s", w.Code, w.Body.String())
	}
}
