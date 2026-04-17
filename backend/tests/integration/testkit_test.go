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
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type integrationKit struct {
	router   *gin.Engine
	db       *gorm.DB
	users    *repositories.UserRepository
	redisURL string
}

type fakeEmailSender struct{}

func (f *fakeEmailSender) SendVerificationEmail(toEmail, token string) error  { return nil }
func (f *fakeEmailSender) SendPasswordResetEmail(toEmail, token string) error { return nil }

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
	return buildRouterWithServerConfig(t, enableAI, config.ServerConfig{})
}

func buildRouterWithServerConfig(t *testing.T, enableAI bool, serverCfg config.ServerConfig) *integrationKit {
	t.Helper()
	gin.SetMode(gin.TestMode)
	lockSharedInfra(t, true)
	db, _ := createIsolatedTestDatabase(t, true)

	userRepository := repositories.NewUserRepository(db)
	profileRepository := repositories.NewProfileRepository(db)
	resetTokenRepo := repositories.NewPasswordResetRepository(db)
	verifyTokenRepo := repositories.NewEmailVerificationRepository(db)
	emailSender := &fakeEmailSender{}

	cfg := &config.Config{
		Server: config.ServerConfig{
			Mode:                       gin.TestMode,
			JWTSecret:                  "integration-secret",
			JWTExpiryMinutes:           30,
			CORSOrigins:                []string{"http://localhost:3000"},
			AuthRateLimitRequests:      serverCfg.AuthRateLimitRequests,
			AuthRateLimitWindowSeconds: serverCfg.AuthRateLimitWindowSeconds,
			AuthRateLimitBurst:         serverCfg.AuthRateLimitBurst,
			ChatRateLimitRequests:      serverCfg.ChatRateLimitRequests,
			ChatRateLimitWindowSeconds: serverCfg.ChatRateLimitWindowSeconds,
			ChatRateLimitBurst:         serverCfg.ChatRateLimitBurst,
		},
		AI: config.AIConfig{
			RedisURL: sharedRedisURL,
		},
	}

	authService := services.NewAuthService(userRepository, resetTokenRepo, verifyTokenRepo, emailSender, cfg, zap.NewNop())
	qClient := queue.NewQueueClient(sharedRedisURL, zap.NewNop())
	t.Cleanup(qClient.Close)
	profileService := services.NewProfileService(profileRepository, qClient, zap.NewNop())

	var chatService *services.ChatService
	if enableAI {
		pgClient := repositories.NewEmbeddingRepository(db, zap.NewNop())
		chatService = services.NewChatService(fakeGemini{}, pgClient)
	} else {
		chatService = services.NewChatService(nil, nil)
	}

	authController := controllers.NewAuthController(authService, cfg)
	profileController := controllers.NewProfileController(profileService)
	chatController := controllers.NewChatController(chatService)

	return &integrationKit{
		router: routes.SetupRouter(
			profileController,
			authController,
			chatController,
			cfg,
			routes.WithLogger(zap.NewNop()),
			routes.WithDB(db),
			routes.WithUserLookup(userRepository),
		),
		db:       db,
		users:    userRepository,
		redisURL: sharedRedisURL,
	}
}

func buildDB(t *testing.T) *gorm.DB {
	t.Helper()
	lockSharedInfra(t, false)
	db, _ := createIsolatedTestDatabase(t, true)
	return db
}

func (k *integrationKit) verifyUserEmail(t *testing.T, email string) {
	t.Helper()

	user, err := k.users.FindByEmail(email)
	require.NoError(t, err)
	require.NoError(t, k.users.UpdateEmailVerified(user.ID))
}

func (k *integrationKit) getVerifyTokenForEmail(t *testing.T, email string) string {
	t.Helper()

	user, err := k.users.FindByEmail(email)
	require.NoError(t, err)

	var token models.EmailVerificationToken
	require.NoError(t, k.db.Where("user_id = ?", user.ID).Order("id DESC").First(&token).Error)
	return token.Token
}

func (k *integrationKit) getResetTokenForEmail(t *testing.T, email string) string {
	t.Helper()

	user, err := k.users.FindByEmail(email)
	require.NoError(t, err)

	var token models.PasswordResetToken
	require.NoError(t, k.db.Where("user_id = ?", user.ID).Order("id DESC").First(&token).Error)
	return token.Token
}

func postJSON(t *testing.T, kit *integrationKit, path string, body any, token string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	payload, err := json.Marshal(body)
	require.NoError(t, err)
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

func requireStatus(t *testing.T, w *httptest.ResponseRecorder, status int) {
	t.Helper()
	require.Equal(t, status, w.Code, w.Body.String())
}

func decodeJSONMap(t *testing.T, w *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var out map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &out), w.Body.String())
	return out
}

func requireErrorCode(t *testing.T, w *httptest.ResponseRecorder, status int, code string) {
	t.Helper()
	requireStatus(t, w, status)
	errObj, ok := decodeJSONMap(t, w)["error"].(map[string]any)
	require.True(t, ok, w.Body.String())
	require.Equal(t, code, errObj["code"])
}

func mustJSON(t *testing.T, v any) []byte {
	t.Helper()
	b, err := json.Marshal(v)
	require.NoError(t, err)
	return b
}

func jsonID(t *testing.T, body map[string]any) uint64 {
	t.Helper()
	id, ok := body["id"].(float64)
	require.True(t, ok, "%T", body["id"])
	return uint64(id)
}

func signupAndGetToken(t *testing.T, kit *integrationKit, email string) (string, *http.Cookie, *http.Cookie) {
	t.Helper()

	signupResp := postJSON(t, kit, "/api/v1/auth/signup", map[string]any{"email": email, "password": "pass123"}, "")
	requireStatus(t, signupResp, http.StatusCreated)

	kit.verifyUserEmail(t, email)

	loginResp := postJSON(t, kit, "/api/v1/auth/login", map[string]any{"email": email, "password": "pass123"}, "")
	requireStatus(t, loginResp, http.StatusOK)

	var out struct {
		Token string `json:"token"`
	}
	require.NoError(t, json.Unmarshal(loginResp.Body.Bytes(), &out))
	require.NotEmpty(t, out.Token)

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
	require.NotNil(t, authCookie)
	require.NotNil(t, csrfCookie)

	return out.Token, authCookie, csrfCookie
}
