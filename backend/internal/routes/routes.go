package routes

import (
	_ "nexia-backend/docs/swagger"
	"nexia-backend/internal/config"
	"nexia-backend/internal/controllers"
	"nexia-backend/internal/middleware"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func SetupRouter(profileController *controllers.ProfileController, authController *controllers.AuthController, cfg *config.Config) *gin.Engine {
	r := gin.Default()

	// API Version 1
	v1 := r.Group("/api/v1")
	{
		// Auth
		v1.POST("/auth", authController.LoginOrSignup)

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
