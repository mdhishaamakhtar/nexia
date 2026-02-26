package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"sync"
	"testing"

	"nexia-backend/internal/ai"
	"nexia-backend/internal/config"
	"nexia-backend/internal/controllers"
	"nexia-backend/internal/models"
	"nexia-backend/internal/routes"
	"nexia-backend/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type memoryStore struct {
	mu           sync.RWMutex
	nextUserID   uint64
	nextProfile  uint64
	usersByName  map[string]*models.User
	profilesByID map[uint64]*models.Profile
}

func newMemoryStore() *memoryStore {
	return &memoryStore{
		nextUserID:   1,
		nextProfile:  1,
		usersByName:  make(map[string]*models.User),
		profilesByID: make(map[uint64]*models.Profile),
	}
}

type authRepo struct {
	store *memoryStore
}

type profileRepo struct {
	store *memoryStore
}

func (r *authRepo) Create(user *models.User) error {
	s := r.store
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.usersByName[user.Username]; exists {
		return errors.New("username already exists")
	}

	cloned := *user
	cloned.ID = s.nextUserID
	s.nextUserID++
	s.usersByName[user.Username] = &cloned
	user.ID = cloned.ID
	return nil
}

func (r *authRepo) FindByUsername(username string) (*models.User, error) {
	s := r.store
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, ok := s.usersByName[username]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	cloned := *user
	return &cloned, nil
}

func (r *profileRepo) Create(profile *models.Profile) error {
	s := r.store
	s.mu.Lock()
	defer s.mu.Unlock()

	profile.ID = s.nextProfile
	s.nextProfile++
	stored := cloneProfile(profile)
	applyChildIDs(stored)
	s.profilesByID[stored.ID] = stored
	return nil
}

func (r *profileRepo) FindByID(id uint64, userID uint64) (*models.Profile, error) {
	s := r.store
	s.mu.RLock()
	defer s.mu.RUnlock()

	p, ok := s.profilesByID[id]
	if !ok || p.UserID != userID {
		return nil, gorm.ErrRecordNotFound
	}
	return cloneProfile(p), nil
}

func (r *profileRepo) FindAll(page, limit int, search, relationshipType string, userID uint64) ([]models.Profile, int64, error) {
	s := r.store
	s.mu.RLock()
	defer s.mu.RUnlock()

	list := make([]models.Profile, 0)
	for _, p := range s.profilesByID {
		if p.UserID != userID {
			continue
		}
		if relationshipType != "" && string(p.RelationshipType) != relationshipType {
			continue
		}
		if search != "" && !strings.Contains(strings.ToLower(p.FullName), strings.ToLower(search)) {
			continue
		}
		list = append(list, *cloneProfile(p))
	}
	sort.Slice(list, func(i, j int) bool { return list[i].ID < list[j].ID })

	total := int64(len(list))
	start := (page - 1) * limit
	if start >= len(list) {
		return []models.Profile{}, total, nil
	}
	end := start + limit
	if end > len(list) {
		end = len(list)
	}
	return list[start:end], total, nil
}

func (r *profileRepo) Update(profile *models.Profile) error {
	s := r.store
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, ok := s.profilesByID[profile.ID]
	if !ok || existing.UserID != profile.UserID {
		return gorm.ErrRecordNotFound
	}

	stored := cloneProfile(profile)
	applyChildIDs(stored)
	s.profilesByID[profile.ID] = stored
	return nil
}

func (r *profileRepo) Delete(id uint64, userID uint64) error {
	s := r.store
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, ok := s.profilesByID[id]
	if !ok || existing.UserID != userID {
		return gorm.ErrRecordNotFound
	}
	delete(s.profilesByID, id)
	return nil
}

func cloneProfile(p *models.Profile) *models.Profile {
	copyProfile := *p
	copyProfile.Tags = append([]models.Tag(nil), p.Tags...)
	copyProfile.PoliticalViews = append([]models.PoliticalView(nil), p.PoliticalViews...)
	copyProfile.FoodRestrictions = append([]models.FoodRestriction(nil), p.FoodRestrictions...)
	copyProfile.MovieGenres = append([]models.MovieGenre(nil), p.MovieGenres...)
	copyProfile.BookGenres = append([]models.BookGenre(nil), p.BookGenres...)
	copyProfile.HangoutPlaces = append([]models.HangoutPlace(nil), p.HangoutPlaces...)
	copyProfile.Quotes = append([]models.Quote(nil), p.Quotes...)
	copyProfile.TopSongs = append([]models.TopSong(nil), p.TopSongs...)
	if p.AssociatedSong != nil {
		song := *p.AssociatedSong
		copyProfile.AssociatedSong = &song
	}
	return &copyProfile
}

func applyChildIDs(p *models.Profile) {
	for i := range p.Tags {
		p.Tags[i].ProfileID = p.ID
		p.Tags[i].ID = uint64(i + 1)
	}
	for i := range p.PoliticalViews {
		p.PoliticalViews[i].ProfileID = p.ID
		p.PoliticalViews[i].ID = uint64(i + 1)
	}
	for i := range p.FoodRestrictions {
		p.FoodRestrictions[i].ProfileID = p.ID
		p.FoodRestrictions[i].ID = uint64(i + 1)
	}
	for i := range p.MovieGenres {
		p.MovieGenres[i].ProfileID = p.ID
		p.MovieGenres[i].ID = uint64(i + 1)
	}
	for i := range p.BookGenres {
		p.BookGenres[i].ProfileID = p.ID
		p.BookGenres[i].ID = uint64(i + 1)
	}
	for i := range p.HangoutPlaces {
		p.HangoutPlaces[i].ProfileID = p.ID
		p.HangoutPlaces[i].ID = uint64(i + 1)
	}
	for i := range p.Quotes {
		p.Quotes[i].ProfileID = p.ID
		p.Quotes[i].ID = uint64(i + 1)
	}
	for i := range p.TopSongs {
		p.TopSongs[i].ProfileID = p.ID
		p.TopSongs[i].ID = uint64(i + 1)
	}
	if p.AssociatedSong != nil {
		p.AssociatedSong.ProfileID = p.ID
	}
}

type fakeQueue struct{}

func (fakeQueue) EnqueueEmbeddingTask(profileID uint) error  { return nil }
func (fakeQueue) EnqueueDeletionTask(profileID uint64) error { return nil }

type fakeGemini struct{}

func (fakeGemini) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	return []float32{0.1, 0.2, 0.3}, nil
}

func (fakeGemini) GenerateChatResponse(ctx context.Context, systemPrompt string, userMessage string) (string, error) {
	if strings.Contains(userMessage, "trigger-ai-fail") {
		return "", errors.New("fake chat failure")
	}
	return "Synthetic answer based on context", nil
}

type fakeVector struct{}

func (fakeVector) SearchContext(ctx context.Context, userID uint64, queryEmbedding []float32, limit int) ([]ai.SearchResult, error) {
	return []ai.SearchResult{
		{
			ProfileID: 1,
			Score:     0.95,
			Payload: map[string]interface{}{
				"full_name":         "Test Friend",
				"relationship_type": "Friend",
				"music_preference":  "Rock",
				"favorite_movie":    "Inception",
				"food_restrictions": []interface{}{map[string]interface{}{"restriction": "None"}},
				"top_songs":         []interface{}{map[string]interface{}{"name": "Song A", "artist": "Artist A"}},
				"associated_song":   map[string]interface{}{"name": "Song B", "artist": "Artist B"},
				"created_at":        "ignored",
				"updated_at":        "ignored",
				"id":                1,
				"user_id":           userID,
				"profile_id":        1,
			},
		},
	}, nil
}

func buildRouter(t *testing.T, enableAI bool) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)

	store := newMemoryStore()
	userRepo := &authRepo{store: store}
	profileRepository := &profileRepo{store: store}

	cfg := &config.Config{Server: config.ServerConfig{Mode: gin.TestMode, JWTSecret: "integration-secret", JWTExpiryMinutes: 30, CORSOrigins: []string{"http://localhost:3000"}}}
	authService := services.NewAuthService(userRepo, cfg)
	profileService := services.NewProfileService(profileRepository, fakeQueue{})

	var chatService *services.ChatService
	if enableAI {
		chatService = services.NewChatService(fakeGemini{}, fakeVector{})
	} else {
		chatService = services.NewChatService(nil, nil)
	}

	authController := controllers.NewAuthController(authService, cfg)
	profileController := controllers.NewProfileController(profileService)
	chatController := controllers.NewChatController(chatService)

	return routes.SetupRouter(profileController, authController, chatController, cfg)
}

func postJSON(t *testing.T, r *gin.Engine, path string, body any, token string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal body: %v", err)
	}
	return doRequest(t, r, http.MethodPost, path, payload, token, cookies...)
}

func doRequest(t *testing.T, r *gin.Engine, method, path string, body []byte, token string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for _, c := range cookies {
		req.AddCookie(c)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func decodeJSONMap(t *testing.T, w *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var out map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatalf("unmarshal json: %v, body: %s", err, w.Body.String())
	}
	return out
}

func mustJSON(t *testing.T, v any) []byte {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return b
}

func signupAndGetToken(t *testing.T, r *gin.Engine, username string) (string, *http.Cookie) {
	t.Helper()
	resp := postJSON(t, r, "/api/v1/auth", map[string]any{"username": username, "password": "pass123"}, "")
	if resp.Code != http.StatusOK {
		t.Fatalf("auth expected 200, got %d body=%s", resp.Code, resp.Body.String())
	}
	var out struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(resp.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode auth: %v", err)
	}
	if out.Token == "" {
		t.Fatalf("expected token")
	}
	cookies := resp.Result().Cookies()
	var authCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "nexia_token" {
			authCookie = c
			break
		}
	}
	if authCookie == nil {
		t.Fatalf("expected nexia_token cookie")
	}
	return out.Token, authCookie
}
