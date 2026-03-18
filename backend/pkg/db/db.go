package db

import (
	"fmt"
	"time"

	"nexia-backend/internal/config"
	"nexia-backend/internal/logging"

	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

var (
	openGorm             = gorm.Open
	newPostgresDialector = func(dsn string) gorm.Dialector { return postgres.Open(dsn) }
)

func buildDSN(cfg *config.Config) string {
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.DB.Host,
		cfg.DB.Port,
		cfg.DB.User,
		cfg.DB.Password,
		cfg.DB.Name,
		cfg.DB.SSLMode,
	)
}

func New(cfg *config.Config, logger *zap.Logger) (*gorm.DB, error) {
	dsn := buildDSN(cfg)

	var err error
	DB, err = openGorm(newPostgresDialector(dsn), &gorm.Config{
		Logger: logging.NewGormLogger(logger),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql db: %w", err)
	}

	// Connection pool settings
	sqlDB.SetMaxIdleConns(cfg.DB.MaxIdleConns)
	sqlDB.SetMaxOpenConns(cfg.DB.MaxOpenConns)
	sqlDB.SetConnMaxLifetime(time.Duration(cfg.DB.ConnMaxLifetimeMinutes) * time.Minute)

	logger.Info("connected to database successfully",
		zap.Int("db_max_idle_conns", cfg.DB.MaxIdleConns),
		zap.Int("db_max_open_conns", cfg.DB.MaxOpenConns),
		zap.Int("db_conn_max_lifetime_minutes", cfg.DB.ConnMaxLifetimeMinutes),
	)
	return DB, nil
}
