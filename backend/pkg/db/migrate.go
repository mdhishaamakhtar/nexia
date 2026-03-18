package db

import (
	"fmt"

	"nexia-backend/internal/config"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"go.uber.org/zap"
)

type migrationRunner interface {
	Up() error
}

var newMigrator = func(sourceURL, databaseURL string) (migrationRunner, error) {
	return migrate.New(sourceURL, databaseURL)
}

func buildMigrationDSN(cfg *config.Config) string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
		cfg.DB.User,
		cfg.DB.Password,
		cfg.DB.Host,
		cfg.DB.Port,
		cfg.DB.Name,
		cfg.DB.SSLMode,
	)
}

func RunMigrations(cfg *config.Config, logger *zap.Logger) error {
	if !cfg.DB.RunMigrations {
		logger.Info("startup migrations disabled by config")
		return nil
	}

	dsn := buildMigrationDSN(cfg)

	m, err := newMigrator(
		"file://migrations",
		dsn,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run up migrations: %w", err)
	}

	logger.Info("migrations ran successfully")
	return nil
}
