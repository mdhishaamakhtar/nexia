package routes

import (
	"context"
	"net/http"
	_ "nexia-backend/docs/swagger"
	"nexia-backend/internal/config"
	"nexia-backend/internal/controllers"
	"nexia-backend/internal/logging"
	"nexia-backend/internal/middleware"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type options struct {
	logger *zap.Logger
	db     *gorm.DB
}

type Option func(*options)

func WithLogger(logger *zap.Logger) Option {
	return func(o *options) {
		o.logger = logger
	}
}

func WithDB(db *gorm.DB) Option {
	return func(o *options) {
		o.db = db
	}
}

func SetupRouter(profileController *controllers.ProfileController, authController *controllers.AuthController, chatController *controllers.ChatController, cfg *config.Config, opts ...Option) *gin.Engine {
	options := options{}
	for _, opt := range opts {
		opt(&options)
	}
	if options.logger == nil {
		panic("router setup requires a logger")
	}

	logging.ConfigureGin(options.logger)
	gin.SetMode(cfg.Server.Mode)
	r := gin.New()

	allowOrigins := cfg.Server.CORSOrigins

	r.Use(middleware.RequestContext(options.logger.Named("http")))
	r.Use(middleware.Recovery(options.logger.Named("http")))

	authRateLimit := middleware.NewAuthRateLimit(options.logger)

	// CORS Middleware
	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", middleware.CSRFHeaderName},
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
			if options.db != nil {
				sqlDB, err := options.db.DB()
				if err != nil {
					c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready"})
					return
				}
				ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
				defer cancel()
				if err := sqlDB.PingContext(ctx); err != nil {
					c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not_ready"})
					return
				}
			}
			c.JSON(http.StatusOK, gin.H{"status": "ready"})
		})

		// Auth
		v1.POST("/auth/signup", authRateLimit, authController.Signup)
		v1.POST("/auth/login", authRateLimit, authController.Login)
		v1.GET("/auth/verify-email", authController.VerifyEmail)
		v1.GET("/auth/me", middleware.AuthMiddleware(cfg), authController.Me)
		v1.POST("/auth/logout", middleware.AuthMiddleware(cfg), middleware.CSRFMiddleware(), authController.Logout)
		v1.POST("/auth/forgot-password", authRateLimit, authController.ForgotPassword)
		v1.POST("/auth/reset-password", authRateLimit, authController.ResetPassword)

		// Chat (Protected)
		v1.POST("/chat", middleware.AuthMiddleware(cfg), middleware.CSRFMiddleware(), chatController.Chat)

		// Profiles (Protected)
		profiles := v1.Group("/profiles")
		profiles.Use(middleware.AuthMiddleware(cfg))
		{
			profiles.POST("", middleware.CSRFMiddleware(), profileController.CreateProfile)
			profiles.GET("", profileController.ListProfiles)
			profiles.GET("/:id", profileController.GetProfile)
			profiles.PUT("/:id", middleware.CSRFMiddleware(), profileController.UpdateProfile)
			profiles.DELETE("/:id", middleware.CSRFMiddleware(), profileController.DeleteProfile)
		}

		// Swagger
		v1.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	return r
}
