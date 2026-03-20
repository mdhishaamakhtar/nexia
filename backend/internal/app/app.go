package app

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"nexia-backend/internal/ai"
	"nexia-backend/internal/config"
	"nexia-backend/internal/controllers"
	"nexia-backend/internal/email"
	"nexia-backend/internal/logging"
	"nexia-backend/internal/queue"
	"nexia-backend/internal/repositories"
	"nexia-backend/internal/routes"
	"nexia-backend/internal/services"
	"nexia-backend/pkg/db"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"go.uber.org/fx"
	"go.uber.org/fx/fxevent"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

func New() *fx.App {
	return fx.New(
		fx.WithLogger(func(logger *zap.Logger) fxevent.Logger {
			return &fxevent.ZapLogger{Logger: logger.Named("fx")}
		}),
		fx.Provide(
			config.LoadConfig,
			logging.NewLogger,
			db.New,

			// Repositories
			fx.Annotate(repositories.NewProfileRepository, fx.As(new(services.ProfileRepository))),
			fx.Annotate(
				repositories.NewEmbeddingRepository,
				fx.As(new(services.EmbeddingRepository)),
				fx.As(new(services.VectorSearchClient)),
			),
			fx.Annotate(repositories.NewUserRepository, fx.As(new(services.UserRepository))),
			fx.Annotate(repositories.NewPasswordResetRepository, fx.As(new(services.PasswordResetRepository))),
			fx.Annotate(repositories.NewEmailVerificationRepository, fx.As(new(services.EmailVerificationRepository))),

			fx.Annotate(email.NewEmailService, fx.As(new(services.EmailSender))),

			// AI / queue
			NewGeminiClient,
			NewGeminiForChat,
			NewQueueClient,
			fx.Annotate(NewEmbeddingTaskQueue, fx.As(new(services.EmbeddingTaskQueue))),
			NewEmbeddingServiceFactory,

			// Services
			services.NewProfileService,
			services.NewAuthService,
			services.NewChatService,

			// Controllers
			controllers.NewProfileController,
			controllers.NewAuthController,
			controllers.NewChatController,

			// Infrastructure
			NewRouter,
			queue.NewTaskHandler,
			NewAsynqServer,
			NewHTTPServer,
		),
		fx.Invoke(db.RunMigrations, RegisterQueueWorker, RegisterHTTPServer),
	)
}

func NewGeminiClient(cfg *config.Config, logger *zap.Logger) (*ai.GeminiClient, error) {
	if cfg.AI.GeminiAPIKey == "" {
		logger.Warn("gemini client disabled: missing api key")
		return nil, nil
	}

	client, err := ai.NewGeminiClient(cfg.AI.GeminiAPIKey)
	if err != nil {
		return nil, err
	}

	logger.Info("gemini client initialized")
	return client, nil
}

func NewQueueClient(cfg *config.Config, logger *zap.Logger) *queue.QueueClient {
	if cfg.AI.RedisURL == "" {
		logger.Info("queue client disabled: missing redis url")
		return nil
	}

	logger.Info("queue client initialized")
	return queue.NewQueueClient(cfg.AI.RedisURL, logger)
}

func NewEmbeddingTaskQueue(client *queue.QueueClient) services.EmbeddingTaskQueue {
	return client
}

func NewGeminiForChat(client *ai.GeminiClient) services.GeminiClient {
	if client == nil {
		return nil // return a true nil interface, not a nil pointer wrapped in an interface
	}
	return client
}

// NewEmbeddingServiceFactory creates the EmbeddingService, or returns nil if Gemini is not configured.
// It takes *ai.GeminiClient (concrete pointer) so we can safely nil-check it before creating
// the service — a nil *T converted to an interface is a non-nil interface in Go, which would
// bypass the nil guards inside EmbeddingService.
func NewEmbeddingServiceFactory(
	gemini *ai.GeminiClient,
	profiles services.ProfileRepository,
	repo services.EmbeddingRepository,
	logger *zap.Logger,
) *services.EmbeddingService {
	if gemini == nil {
		logger.Warn("embedding service disabled: missing gemini client")
		return nil
	}
	return services.NewEmbeddingService(profiles, gemini, repo, logger)
}

func NewRouter(
	profileController *controllers.ProfileController,
	authController *controllers.AuthController,
	chatController *controllers.ChatController,
	cfg *config.Config,
	logger *zap.Logger,
	db *gorm.DB,
	userRepo services.UserRepository,
) *gin.Engine {
	return routes.SetupRouter(
		profileController,
		authController,
		chatController,
		cfg,
		routes.WithLogger(logger),
		routes.WithDB(db),
		routes.WithUserLookup(userRepo),
	)
}

func NewAsynqServer(cfg *config.Config, logger *zap.Logger) *asynq.Server {
	if cfg.AI.RedisURL == "" {
		return nil
	}

	return asynq.NewServer(
		queue.ParseRedisOpt(cfg.AI.RedisURL),
		asynq.Config{
			Concurrency: 10,
			Logger:      logging.NewAsynqLogger(logger),
			LogLevel:    asynq.WarnLevel,
		},
	)
}

type httpServerParams struct {
	fx.In

	Lifecycle fx.Lifecycle
	Config    *config.Config
	Logger    *zap.Logger
	Router    *gin.Engine
}

func NewHTTPServer(p httpServerParams) *http.Server {
	addr := fmt.Sprintf(":%d", p.Config.Server.Port)
	httpErrorLog := zap.NewStdLog(p.Logger.Named("net_http"))
	httpErrorLog.SetFlags(0)
	httpErrorLog.SetPrefix("")
	return &http.Server{
		Addr:              addr,
		Handler:           p.Router,
		ErrorLog:          httpErrorLog,
		ReadHeaderTimeout: 5 * time.Second,
	}
}

type queueWorkerParams struct {
	fx.In

	Lifecycle        fx.Lifecycle
	Logger           *zap.Logger
	Server           *asynq.Server `optional:"true"`
	TaskHandler      *queue.TaskHandler
	EmbeddingService *services.EmbeddingService `optional:"true"`
	QueueClient      *queue.QueueClient
}

type queueWorkerServer interface {
	Run(asynq.Handler) error
	Shutdown()
}

type closableQueueClient interface {
	Close()
}

func RegisterQueueWorker(p queueWorkerParams) {
	if p.QueueClient == nil || p.Server == nil || p.EmbeddingService == nil {
		return
	}

	appendQueueWorkerHooks(p.Lifecycle, p.Logger, p.Server, p.TaskHandler, p.QueueClient)
}

func appendQueueWorkerHooks(lifecycle fx.Lifecycle, logger *zap.Logger, server queueWorkerServer, taskHandler *queue.TaskHandler, queueClient closableQueueClient) {
	mux := asynq.NewServeMux()
	mux.HandleFunc(queue.TypeEmbeddingTask, taskHandler.HandleEmbeddingTask)
	mux.HandleFunc(queue.TypeDeletionTask, taskHandler.HandleDeletionTask)

	lifecycle.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			logger.Info("starting queue worker")
			go func() {
				if err := server.Run(mux); err != nil {
					logger.Error("queue worker exited", zap.Error(err))
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			logger.Info("stopping queue worker")
			server.Shutdown()
			if queueClient != nil {
				queueClient.Close()
			}
			return nil
		},
	})
}

type httpServerInvokeParams struct {
	fx.In

	Lifecycle fx.Lifecycle
	Logger    *zap.Logger
	Server    *http.Server
}

type lifecycleHTTPServer interface {
	ListenAndServe() error
	Shutdown(context.Context) error
}

func RegisterHTTPServer(p httpServerInvokeParams) {
	appendHTTPServerHooks(p.Lifecycle, p.Logger, p.Server)
}

func appendHTTPServerHooks(lifecycle fx.Lifecycle, logger *zap.Logger, server lifecycleHTTPServer) {
	lifecycle.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			logger.Info("starting http server")

			go func() {
				if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
					logger.Fatal("http server exited", zap.Error(err))
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			logger.Info("stopping http server")
			return server.Shutdown(ctx)
		},
	})
}
