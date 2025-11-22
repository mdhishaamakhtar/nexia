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

	"github.com/gin-gonic/gin"
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

	// 2. Connect to Database
	if err := db.Connect(cfg); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// 2.1 Run Migrations
	if err := db.RunMigrations(cfg); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// 3. Initialize Layers
	profileRepo := repositories.NewProfileRepository(db.DB)
	profileService := services.NewProfileService(profileRepo)
	profileController := controllers.NewProfileController(profileService)

	userRepo := repositories.NewUserRepository(db.DB)
	authService := services.NewAuthService(userRepo, cfg)
	authController := controllers.NewAuthController(authService)

	// 4. Setup Router
	r := routes.SetupRouter(profileController, authController, cfg)

	// 5. Run Server
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("Server starting on %s in %s mode", addr, cfg.Server.Mode)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
