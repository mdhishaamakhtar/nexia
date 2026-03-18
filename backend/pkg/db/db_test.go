package db

import (
	"errors"
	"strings"
	"testing"

	"nexia-backend/internal/config"

	"github.com/golang-migrate/migrate/v4"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func testConfig() *config.Config {
	return &config.Config{
		DB: config.DBConfig{
			Host:                   "localhost",
			Port:                   5432,
			User:                   "postgres",
			Password:               "secret",
			Name:                   "nexia",
			SSLMode:                "disable",
			RunMigrations:          true,
			MaxIdleConns:           5,
			MaxOpenConns:           7,
			ConnMaxLifetimeMinutes: 11,
		},
	}
}

type fakeMigrator struct {
	upErr error
}

func (f *fakeMigrator) Up() error {
	return f.upErr
}

func TestBuildDSNFunctions(t *testing.T) {
	cfg := testConfig()

	if got := buildDSN(cfg); !strings.Contains(got, "host=localhost") || !strings.Contains(got, "dbname=nexia") {
		t.Fatalf("unexpected dsn %q", got)
	}
	if got := buildMigrationDSN(cfg); !strings.Contains(got, "postgres://postgres:secret@localhost:5432/nexia") {
		t.Fatalf("unexpected migration dsn %q", got)
	}
}

func TestNew(t *testing.T) {
	cfg := testConfig()
	oldOpen := openGorm
	oldDialector := newPostgresDialector
	defer func() {
		openGorm = oldOpen
		newPostgresDialector = oldDialector
	}()

	newPostgresDialector = func(dsn string) gorm.Dialector {
		if !strings.Contains(dsn, "host=localhost") {
			t.Fatalf("unexpected dsn %q", dsn)
		}
		return sqlite.Open("file::memory:?cache=shared")
	}
	openGorm = func(dialector gorm.Dialector, opts ...gorm.Option) (*gorm.DB, error) {
		return gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	}

	db, err := New(cfg, zap.NewNop())
	if err != nil {
		t.Fatalf("New returned error: %v", err)
	}
	if db == nil {
		t.Fatal("expected db")
	}

	t.Run("open error", func(t *testing.T) {
		openGorm = func(dialector gorm.Dialector, opts ...gorm.Option) (*gorm.DB, error) {
			return nil, errors.New("connect failed")
		}
		if _, err := New(cfg, zap.NewNop()); err == nil || !strings.Contains(err.Error(), "failed to connect to database") {
			t.Fatalf("unexpected error %v", err)
		}
	})
}

func TestRunMigrations(t *testing.T) {
	cfg := testConfig()
	old := newMigrator
	defer func() { newMigrator = old }()

	t.Run("disabled", func(t *testing.T) {
		cfgCopy := *cfg
		cfgCopy.DB.RunMigrations = false
		if err := RunMigrations(&cfgCopy, zap.NewNop()); err != nil {
			t.Fatalf("RunMigrations returned error: %v", err)
		}
	})

	t.Run("constructor error", func(t *testing.T) {
		newMigrator = func(sourceURL, databaseURL string) (migrationRunner, error) {
			return nil, errors.New("new failed")
		}
		if err := RunMigrations(cfg, zap.NewNop()); err == nil || !strings.Contains(err.Error(), "failed to create migrate instance") {
			t.Fatalf("unexpected error %v", err)
		}
	})

	t.Run("up error", func(t *testing.T) {
		newMigrator = func(sourceURL, databaseURL string) (migrationRunner, error) {
			return &fakeMigrator{upErr: errors.New("up failed")}, nil
		}
		if err := RunMigrations(cfg, zap.NewNop()); err == nil || !strings.Contains(err.Error(), "failed to run up migrations") {
			t.Fatalf("unexpected error %v", err)
		}
	})

	t.Run("success and no change", func(t *testing.T) {
		for _, upErr := range []error{nil, migrate.ErrNoChange} {
			newMigrator = func(sourceURL, databaseURL string) (migrationRunner, error) {
				return &fakeMigrator{upErr: upErr}, nil
			}
			if err := RunMigrations(cfg, zap.NewNop()); err != nil {
				t.Fatalf("RunMigrations returned error: %v", err)
			}
		}
	})
}
