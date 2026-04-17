package integration_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"nexia-backend/internal/config"
	"nexia-backend/internal/controllers"
	"nexia-backend/internal/middleware"
	"nexia-backend/internal/models"
	"nexia-backend/internal/queue"
	"nexia-backend/internal/repositories"
	"nexia-backend/internal/routes"
	"nexia-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/modules/redis"
	"go.uber.org/zap"
	gormPostgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type integrationKit struct {
	router   *gin.Engine
	db       *gorm.DB
	users    *repositories.UserRepository
	redisURL string
}

type fakeEmailSender struct{}

func (f *fakeEmailSender) SendVerificationEmail(toEmail, token string) error { return nil }
func (f *fakeEmailSender) SendPasswordResetEmail(toEmail, token string) error {
	return nil
}

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

func buildRouter(t *testing.T, enableAI bool) *integrationKit {
	t.Helper()
	gin.SetMode(gin.TestMode)
	ctx := context.Background()

	pgContainer, err := postgres.Run(ctx,
		"pgvector/pgvector:pg16",
		postgres.WithDatabase("nexia"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("secret"),
		postgres.BasicWaitStrategies(),
	)
	if err != nil {
		t.Fatalf("run postgres container: %v", err)
	}
	t.Cleanup(func() {
		_ = pgContainer.Terminate(ctx)
	})

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("get db connection string: %v", err)
	}

	redisContainer, err := redis.Run(ctx, "redis:7")
	if err != nil {
		t.Fatalf("run redis container: %v", err)
	}
	t.Cleanup(func() {
		_ = redisContainer.Terminate(ctx)
	})
	redisURL, err := redisContainer.ConnectionString(ctx)
	if err != nil {
		t.Fatalf("get redis connection string: %v", err)
	}

	db, err := gorm.Open(gormPostgres.Open(connStr), &gorm.Config{})
	if err != nil {
		t.Fatalf("open postgres: %v", err)
	}

	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS vector;").Error; err != nil {
		t.Fatalf("create vector extension: %v", err)
	}

	migrator, err := migrate.New("file://../../migrations", connStr)
	if err != nil {
		t.Fatalf("create migrator: %v", err)
	}
	if err := migrator.Up(); err != nil && err != migrate.ErrNoChange {
		t.Fatalf("run migrations: %v", err)
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
		AI: config.AIConfig{
			RedisURL: redisURL, // Enable Asynq and pass in the testcontainer URL
		},
	}

	authService := services.NewAuthService(userRepository, resetTokenRepo, verifyTokenRepo, emailSender, cfg, zap.NewNop())

	// Real embedded queue pointing to Redis
	qClient := queue.NewQueueClient(redisURL, zap.NewNop())
	profileService := services.NewProfileService(profileRepository, qClient, zap.NewNop())

	var chatService *services.ChatService
	if enableAI {
		// Real embedding repository instead of fakeVector
		pgClient := repositories.NewEmbeddingRepository(db, zap.NewNop())
		chatService = services.NewChatService(fakeGemini{}, pgClient)
	} else {
		chatService = services.NewChatService(nil, nil)
	}

	authController := controllers.NewAuthController(authService, cfg)
	profileController := controllers.NewProfileController(profileService)
	chatController := controllers.NewChatController(chatService)

	return &integrationKit{
		router:   routes.SetupRouter(profileController, authController, chatController, cfg, routes.WithLogger(zap.NewNop()), routes.WithDB(db), routes.WithUserLookup(userRepository)),
		db:       db,
		users:    userRepository,
		redisURL: redisURL,
	}
}

// buildDB spins up a postgres container with pgvector, runs migrations, and
// returns a connected *gorm.DB. Used by tests that need a real DB but not
// the full HTTP router.
func buildDB(t *testing.T) *gorm.DB {
	t.Helper()
	ctx := context.Background()

	pgContainer, err := postgres.Run(ctx,
		"pgvector/pgvector:pg16",
		postgres.WithDatabase("nexia"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("secret"),
		postgres.BasicWaitStrategies(),
	)
	if err != nil {
		t.Fatalf("run postgres container: %v", err)
	}
	t.Cleanup(func() { _ = pgContainer.Terminate(ctx) })

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("get db connection string: %v", err)
	}

	db, err := gorm.Open(gormPostgres.Open(connStr), &gorm.Config{})
	if err != nil {
		t.Fatalf("open postgres: %v", err)
	}

	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS vector;").Error; err != nil {
		t.Fatalf("create vector extension: %v", err)
	}

	migrator, err := migrate.New("file://../../migrations", connStr)
	if err != nil {
		t.Fatalf("create migrator: %v", err)
	}
	if err := migrator.Up(); err != nil && err != migrate.ErrNoChange {
		t.Fatalf("run migrations: %v", err)
	}

	return db
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
