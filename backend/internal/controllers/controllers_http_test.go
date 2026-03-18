package controllers_test

import (
	"bytes"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"nexia-backend/internal/ai"
	"nexia-backend/internal/config"
	"nexia-backend/internal/controllers"
	"nexia-backend/internal/models"
	"nexia-backend/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type controllerProfileRepo struct {
	err error
}

func (r *controllerProfileRepo) Create(profile *models.Profile) error { return r.err }
func (r *controllerProfileRepo) FindByID(id uint64, userID uint64) (*models.Profile, error) {
	if r.err != nil {
		return nil, r.err
	}
	return &models.Profile{ID: id, UserID: userID, FullName: "X"}, nil
}
func (r *controllerProfileRepo) FindAll(page, limit int, search string, relationshipType string, userID uint64) ([]models.Profile, int64, error) {
	if r.err != nil {
		return nil, 0, r.err
	}
	return []models.Profile{{ID: 1, UserID: userID, FullName: "A"}}, 1, nil
}
func (r *controllerProfileRepo) Update(profile *models.Profile) error  { return r.err }
func (r *controllerProfileRepo) Delete(id uint64, userID uint64) error { return r.err }

func newProfileController(repoErr error) *controllers.ProfileController {
	repo := &controllerProfileRepo{err: repoErr}
	svc := services.NewProfileService(repo, nil)
	return controllers.NewProfileController(svc)
}

func TestProfileControllerBranches(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("create missing user id", func(t *testing.T) {
		ctrl := newProfileController(nil)
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(http.MethodPost, "/profiles", bytes.NewBufferString(`{"full_name":"A","relationship_type":"Friend"}`))
		c.Request.Header.Set("Content-Type", "application/json")
		ctrl.CreateProfile(c)
		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 got %d", w.Code)
		}
	})

	t.Run("create bad payload", func(t *testing.T) {
		ctrl := newProfileController(nil)
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("userID", uint64(1))
		c.Request = httptest.NewRequest(http.MethodPost, "/profiles", bytes.NewBufferString(`{"full_name":`))
		c.Request.Header.Set("Content-Type", "application/json")
		ctrl.CreateProfile(c)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d", w.Code)
		}
	})

	t.Run("get invalid id", func(t *testing.T) {
		ctrl := newProfileController(nil)
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("userID", uint64(1))
		c.Params = gin.Params{{Key: "id", Value: "bad"}}
		ctrl.GetProfile(c)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d", w.Code)
		}
	})

	t.Run("get not found", func(t *testing.T) {
		ctrl := newProfileController(gorm.ErrRecordNotFound)
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("userID", uint64(1))
		c.Params = gin.Params{{Key: "id", Value: "1"}}
		ctrl.GetProfile(c)
		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404 got %d", w.Code)
		}
	})

	t.Run("update invalid id", func(t *testing.T) {
		ctrl := newProfileController(nil)
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("userID", uint64(1))
		c.Params = gin.Params{{Key: "id", Value: "bad"}}
		ctrl.UpdateProfile(c)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d", w.Code)
		}
	})

	t.Run("delete invalid id", func(t *testing.T) {
		ctrl := newProfileController(nil)
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("userID", uint64(1))
		c.Params = gin.Params{{Key: "id", Value: "bad"}}
		ctrl.DeleteProfile(c)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d", w.Code)
		}
	})

	t.Run("list server error", func(t *testing.T) {
		ctrl := newProfileController(errors.New("boom"))
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("userID", uint64(1))
		c.Request = httptest.NewRequest(http.MethodGet, "/profiles?page=1&limit=1", nil)
		ctrl.ListProfiles(c)
		if w.Code != http.StatusInternalServerError {
			t.Fatalf("expected 500 got %d", w.Code)
		}
	})
}

type staticGemini struct{}

type staticVector struct{}

func (staticGemini) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	return []float32{0.1}, nil
}

func (staticGemini) GenerateChatResponse(ctx context.Context, systemPrompt string, userMessage string) (string, error) {
	return "ok", nil
}

func (staticVector) SearchContext(ctx context.Context, userID uint64, queryEmbedding []float32, limit int) ([]ai.SearchResult, error) {
	return []ai.SearchResult{{Payload: map[string]interface{}{"full_name": "A"}}}, nil
}

func TestChatControllerMissingUserContext(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := services.NewChatService(staticGemini{}, staticVector{})
	ctrl := controllers.NewChatController(svc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/chat", bytes.NewBufferString(`{"message":"hello"}`))
	c.Request.Header.Set("Content-Type", "application/json")
	ctrl.Chat(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 got %d", w.Code)
	}
}

func newAuthController() *controllers.AuthController {
	cfg := &config.Config{Server: config.ServerConfig{JWTSecret: "test-secret", JWTExpiryMinutes: 60}}
	repo := &fakeAuthUserRepo{}
	resetRepo := &fakeAuthResetRepo{}
	verifyRepo := &fakeAuthVerifyRepo{}
	emailSvc := &fakeAuthEmailSvc{}
	svc := services.NewAuthService(repo, resetRepo, verifyRepo, emailSvc, cfg)
	return controllers.NewAuthController(svc, cfg)
}

// Minimal fakes for auth controller unit tests
type fakeAuthUserRepo struct{}

func (f *fakeAuthUserRepo) Create(user *models.User) error { return nil }
func (f *fakeAuthUserRepo) FindByEmail(email string) (*models.User, error) {
	return nil, errors.New("not found")
}
func (f *fakeAuthUserRepo) FindByID(id uint64) (*models.User, error)     { return nil, nil }
func (f *fakeAuthUserRepo) UpdatePassword(userID uint64, h string) error { return nil }
func (f *fakeAuthUserRepo) UpdateEmailVerified(userID uint64) error      { return nil }

type fakeAuthResetRepo struct{}

func (f *fakeAuthResetRepo) Create(t *models.PasswordResetToken) error { return nil }
func (f *fakeAuthResetRepo) FindByToken(token string) (*models.PasswordResetToken, error) {
	return nil, errors.New("not found")
}
func (f *fakeAuthResetRepo) MarkAsUsed(id uint64) error { return nil }

type fakeAuthVerifyRepo struct{}

func (f *fakeAuthVerifyRepo) Create(t *models.EmailVerificationToken) error { return nil }
func (f *fakeAuthVerifyRepo) FindByToken(token string) (*models.EmailVerificationToken, error) {
	return nil, errors.New("not found")
}
func (f *fakeAuthVerifyRepo) MarkAsUsed(id uint64) error { return nil }

type fakeAuthEmailSvc struct{}

func (f *fakeAuthEmailSvc) SendVerificationEmail(toEmail, token string) error  { return nil }
func (f *fakeAuthEmailSvc) SendPasswordResetEmail(toEmail, token string) error { return nil }

func TestAuthControllerMissingUserIDInMe(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := newAuthController()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/auth/me", nil)
	ctrl.Me(c)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 got %d", w.Code)
	}
}

func TestAuthControllerSignupBindError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := newAuthController()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/signup", bytes.NewBufferString(`{bad json`))
	c.Request.Header.Set("Content-Type", "application/json")
	ctrl.Signup(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d", w.Code)
	}
}

func TestAuthControllerLoginBindError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := newAuthController()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBufferString(`{bad json`))
	c.Request.Header.Set("Content-Type", "application/json")
	ctrl.Login(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d", w.Code)
	}
}

func TestAuthControllerVerifyEmailMissingToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := newAuthController()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/auth/verify-email", nil)
	ctrl.VerifyEmail(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d", w.Code)
	}
}

func TestAuthControllerForgotPasswordBindError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := newAuthController()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/forgot-password", bytes.NewBufferString(`{bad json`))
	c.Request.Header.Set("Content-Type", "application/json")
	ctrl.ForgotPassword(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d", w.Code)
	}
}

func TestAuthControllerResetPasswordBindError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := newAuthController()

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/auth/reset-password", bytes.NewBufferString(`{bad json`))
	c.Request.Header.Set("Content-Type", "application/json")
	ctrl.ResetPassword(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d", w.Code)
	}
}

func TestProfileControllerMissingUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := newProfileController(nil)

	cases := []struct {
		name string
		fn   func(*gin.Context)
		req  *http.Request
	}{
		{
			name: "get missing userID",
			fn:   ctrl.GetProfile,
			req:  httptest.NewRequest(http.MethodGet, "/profiles/1", nil),
		},
		{
			name: "list missing userID",
			fn:   ctrl.ListProfiles,
			req:  httptest.NewRequest(http.MethodGet, "/profiles", nil),
		},
		{
			name: "update missing userID",
			fn:   ctrl.UpdateProfile,
			req:  httptest.NewRequest(http.MethodPut, "/profiles/1", nil),
		},
		{
			name: "delete missing userID",
			fn:   ctrl.DeleteProfile,
			req:  httptest.NewRequest(http.MethodDelete, "/profiles/1", nil),
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = tc.req
			tc.fn(c)
			if w.Code != http.StatusUnauthorized {
				t.Fatalf("%s: expected 401 got %d", tc.name, w.Code)
			}
		})
	}
}

func TestProfileControllerUpdateBadJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := newProfileController(nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", uint64(1))
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Request = httptest.NewRequest(http.MethodPut, "/profiles/1", bytes.NewBufferString(`{bad json`))
	c.Request.Header.Set("Content-Type", "application/json")
	ctrl.UpdateProfile(c)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 got %d", w.Code)
	}
}

func TestProfileControllerDeleteServiceError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctrl := newProfileController(errors.New("delete failed"))

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", uint64(1))
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	c.Request = httptest.NewRequest(http.MethodDelete, "/profiles/1", nil)
	ctrl.DeleteProfile(c)

	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 got %d", w.Code)
	}
}
