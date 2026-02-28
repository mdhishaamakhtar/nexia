package main

import (
	"fmt"
	"log"

	"nexia-backend/internal/config"
	"nexia-backend/internal/controllers"
	"nexia-backend/internal/repositories"
	"nexia-backend/internal/routes"
	"nexia-backend/internal/services"
	"nexia-backend/pkg/db"

	"nexia-backend/internal/ai"
	"nexia-backend/internal/queue"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
)

// @title Nexia Backend API
// @version 1.0
// @description REST API for Digital Slambook
// @BasePath /api/v1
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	// 1. Load Config
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 1.1 Set Gin Mode
	gin.SetMode(cfg.Server.Mode)

	// 2. Connect to Database (Postgres)
	if err := db.Connect(cfg); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// 2.1 Run Migrations
	if err := db.RunMigrations(cfg); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// 3. Initialize AI & Queue Components
	var queueClient *queue.QueueClient
	var geminiClient *ai.GeminiClient
	var pgvectorClient *ai.PgVectorClient

	// pgvector reuses the existing Postgres connection — no separate host needed
	pgvectorClient = ai.NewPgVectorClient(db.DB)
	log.Println("pgvector client initialized")

	// Only init queue/LLM if Redis URL is present
	if cfg.AI.RedisURL != "" {
		queueClient = queue.NewQueueClient(cfg.AI.RedisURL)
		log.Println("Queue client initialized")

		var err error
		geminiClient, err = ai.NewGeminiClient(cfg.AI.GeminiAPIKey)
		if err != nil {
			log.Printf("Warning: Failed to init Gemini: %v", err)
		}

		// Start Worker
		if geminiClient != nil {
			taskHandler := queue.NewTaskHandler(db.DB, geminiClient, pgvectorClient)
			srv := asynq.NewServer(
				queue.ParseRedisOpt(cfg.AI.RedisURL),
				asynq.Config{
					Concurrency: 10,
					LogLevel:    asynq.WarnLevel,
				},
			)

			mux := asynq.NewServeMux()
			mux.HandleFunc(queue.TypeEmbeddingTask, taskHandler.HandleEmbeddingTask)
			mux.HandleFunc(queue.TypeDeletionTask, taskHandler.HandleDeletionTask)

			go func() {
				log.Println("Starting Queue Worker...")
				if err := srv.Run(mux); err != nil {
					log.Printf("Queue Worker failed: %v", err)
				}
			}()
		}
	} else {
		log.Println("Redis URL not provided, RAG features disabled")
	}

	// 4. Initialize Layers
	profileRepo := repositories.NewProfileRepository(db.DB)
	profileService := services.NewProfileService(profileRepo, queueClient)
	profileController := controllers.NewProfileController(profileService)

	userRepo := repositories.NewUserRepository(db.DB)
	passwordResetRepo := repositories.NewPasswordResetRepository(db.DB)
	authService := services.NewAuthService(userRepo, passwordResetRepo, cfg)
	authController := controllers.NewAuthController(authService, cfg)

	chatService := services.NewChatService(geminiClient, pgvectorClient)
	chatController := controllers.NewChatController(chatService)

	// 5. Setup Router
	r := routes.SetupRouter(profileController, authController, chatController, cfg)

	// 6. Run Server
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("Server starting on %s in %s mode", addr, cfg.Server.Mode)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
