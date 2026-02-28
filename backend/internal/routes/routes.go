package routes

import (
	"net/http"
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

	allowOrigins := cfg.Server.CORSOrigins

	// CORS Middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// API Version 1
	v1 := r.Group("/api/v1")
	{
		v1.GET("/healthz", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})
		v1.GET("/readyz", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "ready"})
		})

		// Auth
		v1.POST("/auth", authController.LoginOrSignup)
		v1.GET("/auth/me", middleware.AuthMiddleware(cfg), authController.Me)
		v1.POST("/auth/logout", middleware.AuthMiddleware(cfg), authController.Logout)
		v1.POST("/auth/forgot-password", authController.ForgotPassword)
		v1.POST("/auth/reset-password", authController.ResetPassword)

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
