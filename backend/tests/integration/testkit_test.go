package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"nexia-backend/internal/ai"
	"nexia-backend/internal/config"
	"nexia-backend/internal/controllers"
	"nexia-backend/internal/middleware"
	"nexia-backend/internal/models"
	"nexia-backend/internal/repositories"
	"nexia-backend/internal/routes"
	"nexia-backend/internal/services"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type integrationKit struct {
	router *gin.Engine
	db     *gorm.DB
	users  *repositories.UserRepository
}

type fakeEmailSender struct{}

func (f *fakeEmailSender) SendVerificationEmail(toEmail, token string) error { return nil }
func (f *fakeEmailSender) SendPasswordResetEmail(toEmail, token string) error {
	return nil
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
			Payload: map[string]any{
				"full_name":         "Test Friend",
				"relationship_type": "Friend",
				"music_preference":  "Rock",
				"favorite_movie":    "Inception",
				"food_restrictions": []any{map[string]any{"restriction": "None"}},
				"top_songs":         []any{map[string]any{"name": "Song A", "artist": "Artist A"}},
				"associated_song":   map[string]any{"name": "Song B", "artist": "Artist B"},
				"created_at":        "ignored",
				"updated_at":        "ignored",
				"id":                1,
				"user_id":           userID,
				"profile_id":        1,
			},
		},
	}, nil
}

func buildRouter(t *testing.T, enableAI bool) *integrationKit {
	t.Helper()
	gin.SetMode(gin.TestMode)

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}

	if err := db.Exec("PRAGMA foreign_keys = ON").Error; err != nil {
		t.Fatalf("enable foreign keys: %v", err)
	}

	for _, stmt := range []string{
		`CREATE TABLE users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL UNIQUE,
			email_verified NUMERIC NOT NULL DEFAULT 0,
			password TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE password_reset_tokens (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			token TEXT NOT NULL UNIQUE,
			expires_at DATETIME NOT NULL,
			used NUMERIC NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token)`,
		`CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)`,
		`CREATE TABLE email_verification_tokens (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			token TEXT NOT NULL UNIQUE,
			expires_at DATETIME NOT NULL,
			used NUMERIC NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token)`,
		`CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id)`,
		`CREATE TABLE profiles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			full_name TEXT NOT NULL,
			bio TEXT,
			profession TEXT,
			long_term_goals TEXT,
			relationship_type TEXT NOT NULL,
			birthday DATE,
			zodiac_sign TEXT,
			music_preference TEXT,
			favorite_movie TEXT,
			favorite_book TEXT,
			favorite_memory TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE INDEX idx_profiles_user_id ON profiles(user_id)`,
		`CREATE INDEX idx_profiles_user_relationship ON profiles(user_id, relationship_type)`,
		`CREATE TABLE tags (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			tag TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE political_views (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			view TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE food_restrictions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			restriction TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE movie_genres (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			genre TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE book_genres (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			genre TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE hangout_places (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			place TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE quotes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			quote TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE top_songs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			name TEXT,
			artist TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE associated_songs (
			profile_id INTEGER PRIMARY KEY,
			name TEXT,
			artist TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
	} {
		if err := db.Exec(stmt).Error; err != nil {
			t.Fatalf("create sqlite schema: %v", err)
		}
	}

	userRepository := repositories.NewUserRepository(db)
	profileRepository := repositories.NewProfileRepository(db)
	resetTokenRepo := repositories.NewPasswordResetRepository(db)
	verifyTokenRepo := repositories.NewEmailVerificationRepository(db)
	emailSender := &fakeEmailSender{}

	cfg := &config.Config{
		Server: config.ServerConfig{
			Mode:             gin.TestMode,
			JWTSecret:        "integration-secret",
			JWTExpiryMinutes: 30,
			CORSOrigins:      []string{"http://localhost:3000"},
		},
	}

	authService := services.NewAuthService(userRepository, resetTokenRepo, verifyTokenRepo, emailSender, cfg)
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

	return &integrationKit{
		router: routes.SetupRouter(profileController, authController, chatController, cfg, routes.WithLogger(zap.NewNop()), routes.WithDB(db)),
		db:     db,
		users:  userRepository,
	}
}

func (k *integrationKit) verifyUserEmail(t *testing.T, email string) {
	t.Helper()

	user, err := k.users.FindByEmail(email)
	if err != nil {
		t.Fatalf("find user by email: %v", err)
	}
	if err := k.users.UpdateEmailVerified(user.ID); err != nil {
		t.Fatalf("verify user email: %v", err)
	}
}

func (k *integrationKit) getVerifyTokenForEmail(t *testing.T, email string) string {
	t.Helper()

	user, err := k.users.FindByEmail(email)
	if err != nil {
		t.Fatalf("find user by email: %v", err)
	}

	var token models.EmailVerificationToken
	if err := k.db.Where("user_id = ?", user.ID).Order("id DESC").First(&token).Error; err != nil {
		t.Fatalf("find verification token: %v", err)
	}
	return token.Token
}

func (k *integrationKit) getResetTokenForEmail(t *testing.T, email string) string {
	t.Helper()

	user, err := k.users.FindByEmail(email)
	if err != nil {
		t.Fatalf("find user by email: %v", err)
	}

	var token models.PasswordResetToken
	if err := k.db.Where("user_id = ?", user.ID).Order("id DESC").First(&token).Error; err != nil {
		t.Fatalf("find reset token: %v", err)
	}
	return token.Token
}

func postJSON(t *testing.T, kit *integrationKit, path string, body any, token string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	payload, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal body: %v", err)
	}
	return doRequest(t, kit, http.MethodPost, path, payload, token, cookies...)
}

func doRequest(t *testing.T, kit *integrationKit, method, path string, body []byte, token string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for _, c := range cookies {
		req.AddCookie(c)
		if c.Name == middleware.CSRFCookieName {
			req.Header.Set(middleware.CSRFHeaderName, c.Value)
		}
	}
	w := httptest.NewRecorder()
	kit.router.ServeHTTP(w, req)
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

func signupAndGetToken(t *testing.T, kit *integrationKit, email string) (string, *http.Cookie, *http.Cookie) {
	t.Helper()

	signupResp := postJSON(t, kit, "/api/v1/auth/signup", map[string]any{"email": email, "password": "pass123"}, "")
	if signupResp.Code != http.StatusCreated {
		t.Fatalf("signup expected 201, got %d body=%s", signupResp.Code, signupResp.Body.String())
	}

	kit.verifyUserEmail(t, email)

	loginResp := postJSON(t, kit, "/api/v1/auth/login", map[string]any{"email": email, "password": "pass123"}, "")
	if loginResp.Code != http.StatusOK {
		t.Fatalf("login expected 200, got %d body=%s", loginResp.Code, loginResp.Body.String())
	}

	var out struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(loginResp.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode auth: %v", err)
	}
	if out.Token == "" {
		t.Fatalf("expected token")
	}

	var authCookie *http.Cookie
	var csrfCookie *http.Cookie
	for _, c := range loginResp.Result().Cookies() {
		if c.Name == "nexia_token" {
			authCookie = c
		}
		if c.Name == middleware.CSRFCookieName {
			csrfCookie = c
		}
	}
	if authCookie == nil {
		t.Fatalf("expected nexia_token cookie")
	}
	if csrfCookie == nil {
		t.Fatalf("expected csrf cookie")
	}

	return out.Token, authCookie, csrfCookie
}
