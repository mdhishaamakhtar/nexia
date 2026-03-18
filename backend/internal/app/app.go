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
			ai.NewPgVectorClient,
			NewGeminiClient,
			NewQueueClient,
			NewVectorSearchClient,
			fx.Annotate(email.NewEmailService, fx.As(new(services.EmailSender))),
			fx.Annotate(repositories.NewProfileRepository, fx.As(new(services.ProfileRepository))),
			fx.Annotate(repositories.NewUserRepository, fx.As(new(services.UserRepository))),
			fx.Annotate(repositories.NewPasswordResetRepository, fx.As(new(services.PasswordResetRepository))),
			fx.Annotate(repositories.NewEmailVerificationRepository, fx.As(new(services.EmailVerificationRepository))),
			fx.Annotate(NewEmbeddingTaskQueue, fx.As(new(services.EmbeddingTaskQueue))),
			fx.Annotate(NewGeminiForChat, fx.As(new(services.GeminiClient))),
			services.NewProfileServiceWithLogger,
			services.NewAuthService,
			services.NewChatService,
			controllers.NewProfileController,
			controllers.NewAuthController,
			controllers.NewChatController,
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
	return client
}

func NewVectorSearchClient(client *ai.PgVectorClient) services.VectorSearchClient {
	return client
}

func NewRouter(
	profileController *controllers.ProfileController,
	authController *controllers.AuthController,
	chatController *controllers.ChatController,
	cfg *config.Config,
	logger *zap.Logger,
	db *gorm.DB,
) *gin.Engine {
	return routes.SetupRouter(
		profileController,
		authController,
		chatController,
		cfg,
		routes.WithLogger(logger),
		routes.WithDB(db),
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
	return &http.Server{
		Addr:              addr,
		Handler:           p.Router,
		ReadHeaderTimeout: 5 * time.Second,
	}
}

type queueWorkerParams struct {
	fx.In

	Lifecycle   fx.Lifecycle
	Logger      *zap.Logger
	Server      *asynq.Server `optional:"true"`
	TaskHandler *queue.TaskHandler
	Gemini      *ai.GeminiClient
	PgVector    *ai.PgVectorClient
	QueueClient *queue.QueueClient
}

func RegisterQueueWorker(p queueWorkerParams) {
	if p.QueueClient == nil || p.Server == nil || p.Gemini == nil || p.PgVector == nil {
		return
	}

	mux := asynq.NewServeMux()
	mux.HandleFunc(queue.TypeEmbeddingTask, p.TaskHandler.HandleEmbeddingTask)
	mux.HandleFunc(queue.TypeDeletionTask, p.TaskHandler.HandleDeletionTask)

	p.Lifecycle.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			p.Logger.Info("starting queue worker")
			go func() {
				if err := p.Server.Run(mux); err != nil {
					p.Logger.Error("queue worker exited", zap.Error(err))
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			p.Logger.Info("stopping queue worker")
			p.Server.Shutdown()
			if p.QueueClient != nil {
				p.QueueClient.Close()
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

func RegisterHTTPServer(p httpServerInvokeParams) {
	p.Lifecycle.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			p.Logger.Info("starting http server",
				zap.String("addr", p.Server.Addr),
			)

			go func() {
				if err := p.Server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
					p.Logger.Fatal("http server exited", zap.Error(err))
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			p.Logger.Info("stopping http server")
			return p.Server.Shutdown(ctx)
		},
	})
}
