package unit_test

import (
	"bytes"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"nexia-backend/internal/ai"
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
