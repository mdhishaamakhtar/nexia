package app

import (
	"context"
	"net/http"
	"testing"

	"nexia-backend/internal/ai"
	"nexia-backend/internal/config"
	"nexia-backend/internal/controllers"
	"nexia-backend/internal/queue"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"go.uber.org/fx"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type fakeLifecycle struct {
	hooks []fx.Hook
}

func (f *fakeLifecycle) Append(hook fx.Hook) {
	f.hooks = append(f.hooks, hook)
}

type fakeQueueServer struct {
	runCalled      bool
	shutdownCalled bool
}

func (f *fakeQueueServer) Run(h asynq.Handler) error {
	f.runCalled = true
	return nil
}

func (f *fakeQueueServer) Shutdown() {
	f.shutdownCalled = true
}

type fakeClosableQueueClient struct {
	closed bool
}

func (f *fakeClosableQueueClient) Close() {
	f.closed = true
}

type fakeHTTPServer struct {
	listenCalled   bool
	shutdownCalled bool
}

func (f *fakeHTTPServer) ListenAndServe() error {
	f.listenCalled = true
	return http.ErrServerClosed
}

func (f *fakeHTTPServer) Shutdown(ctx context.Context) error {
	f.shutdownCalled = true
	return nil
}

func TestConstructorsAndAdapters(t *testing.T) {
	if New() == nil {
		t.Fatal("expected fx app")
	}

	cfg := &config.Config{
		Server: config.ServerConfig{Port: 8080},
		AI:     config.AIConfig{},
	}

	geminiClient, err := NewGeminiClient(cfg, zap.NewNop())
	if err != nil || geminiClient != nil {
		t.Fatalf("expected nil gemini client without api key, got client=%v err=%v", geminiClient, err)
	}
	if NewQueueClient(cfg, zap.NewNop()) != nil {
		t.Fatal("expected nil queue client without redis url")
	}
	if NewAsynqServer(cfg, zap.NewNop()) != nil {
		t.Fatal("expected nil asynq server without redis url")
	}
	if NewEmbeddingTaskQueue(&queue.QueueClient{}) == nil {
		t.Fatal("expected embedding queue adapter")
	}
	if NewGeminiForChat(&ai.GeminiClient{}) == nil {
		t.Fatal("expected gemini adapter")
	}
	if NewVectorSearchClient(&ai.PgVectorClient{}) == nil {
		t.Fatal("expected vector adapter")
	}

	cfg.AI.RedisURL = "redis://localhost:6379/0"
	if NewQueueClient(cfg, zap.NewNop()) == nil {
		t.Fatal("expected queue client when redis url is configured")
	}
	if NewAsynqServer(cfg, zap.NewNop()) == nil {
		t.Fatal("expected asynq server when redis url is configured")
	}

	cfg.AI.GeminiAPIKey = "test-api-key"
	geminiClient, err = NewGeminiClient(cfg, zap.NewNop())
	if err != nil || geminiClient == nil {
		t.Fatalf("expected gemini client with api key, got client=%v err=%v", geminiClient, err)
	}
}

func TestNewHTTPServerAndRouter(t *testing.T) {
	gin.SetMode(gin.TestMode)
	cfg := &config.Config{Server: config.ServerConfig{Port: 9090, Mode: gin.TestMode, CORSOrigins: []string{"http://localhost:3000"}}}
	router := gin.New()

	server := NewHTTPServer(httpServerParams{
		Config: cfg,
		Logger: zap.NewNop(),
		Router: router,
	})
	if server.Addr != ":9090" || server.Handler != router {
		t.Fatalf("unexpected http server %+v", server)
	}

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	engine := NewRouter(&controllers.ProfileController{}, &controllers.AuthController{}, &controllers.ChatController{}, cfg, zap.NewNop(), db)
	if engine == nil {
		t.Fatal("expected gin engine")
	}
}

func TestRegisterHooks(t *testing.T) {
	queueLifecycle := &fakeLifecycle{}
	queueServer := &fakeQueueServer{}
	queueClient := &fakeClosableQueueClient{}
	appendQueueWorkerHooks(queueLifecycle, zap.NewNop(), queueServer, &queue.TaskHandler{}, queueClient)
	if len(queueLifecycle.hooks) != 1 {
		t.Fatalf("expected 1 queue hook got %d", len(queueLifecycle.hooks))
	}
	if err := queueLifecycle.hooks[0].OnStart(context.Background()); err != nil {
		t.Fatalf("queue OnStart returned error: %v", err)
	}
	if err := queueLifecycle.hooks[0].OnStop(context.Background()); err != nil {
		t.Fatalf("queue OnStop returned error: %v", err)
	}
	if !queueServer.shutdownCalled || !queueClient.closed {
		t.Fatalf("expected queue shutdown and close, server=%v client=%v", queueServer.shutdownCalled, queueClient.closed)
	}

	httpLifecycle := &fakeLifecycle{}
	httpServer := &fakeHTTPServer{}
	appendHTTPServerHooks(httpLifecycle, zap.NewNop(), httpServer)
	if len(httpLifecycle.hooks) != 1 {
		t.Fatalf("expected 1 http hook got %d", len(httpLifecycle.hooks))
	}
	if err := httpLifecycle.hooks[0].OnStart(context.Background()); err != nil {
		t.Fatalf("http OnStart returned error: %v", err)
	}
	if err := httpLifecycle.hooks[0].OnStop(context.Background()); err != nil {
		t.Fatalf("http OnStop returned error: %v", err)
	}
	if !httpServer.shutdownCalled {
		t.Fatal("expected http shutdown")
	}
}

func TestRegisterQueueWorkerSkipsWhenDependenciesMissing(t *testing.T) {
	lifecycle := &fakeLifecycle{}
	RegisterQueueWorker(queueWorkerParams{
		Lifecycle: lifecycle,
		Logger:    zap.NewNop(),
	})
	if len(lifecycle.hooks) != 0 {
		t.Fatalf("expected no hooks, got %d", len(lifecycle.hooks))
	}
}

func TestRegisterWrappers(t *testing.T) {
	httpLifecycle := &fakeLifecycle{}
	RegisterHTTPServer(httpServerInvokeParams{
		Lifecycle: httpLifecycle,
		Logger:    zap.NewNop(),
		Server:    &http.Server{},
	})
	if len(httpLifecycle.hooks) != 1 {
		t.Fatalf("expected one http hook, got %d", len(httpLifecycle.hooks))
	}

	queueLifecycle := &fakeLifecycle{}
	RegisterQueueWorker(queueWorkerParams{
		Lifecycle:   queueLifecycle,
		Logger:      zap.NewNop(),
		Server:      &asynq.Server{},
		TaskHandler: &queue.TaskHandler{},
		Gemini:      &ai.GeminiClient{},
		PgVector:    &ai.PgVectorClient{},
		QueueClient: &queue.QueueClient{},
	})
	if len(queueLifecycle.hooks) != 1 {
		t.Fatalf("expected one queue hook, got %d", len(queueLifecycle.hooks))
	}
}
