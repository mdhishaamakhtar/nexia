package routes

import (
	_ "nexia-backend/docs/swagger"
	"nexia-backend/internal/config"
	"nexia-backend/internal/controllers"
	"nexia-backend/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func SetupRouter(profileController *controllers.ProfileController, authController *controllers.AuthController, chatController *controllers.ChatController, cfg *config.Config) *gin.Engine {
	r := gin.Default()

	// CORS Middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// API Version 1
	v1 := r.Group("/api/v1")
	{
		// Auth
		v1.POST("/auth", authController.LoginOrSignup)

		// Chat (Protected)
		v1.POST("/chat", middleware.AuthMiddleware(cfg), chatController.Chat)

		// Profiles (Protected)
		profiles := v1.Group("/profiles")
		profiles.Use(middleware.AuthMiddleware(cfg))
		{
			profiles.POST("", profileController.CreateProfile)
			profiles.GET("", profileController.ListProfiles)
			profiles.GET("/:id", profileController.GetProfile)
			profiles.PUT("/:id", profileController.UpdateProfile)
			profiles.DELETE("/:id", profileController.DeleteProfile)
		}

		// Swagger
		v1.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	return r
}
