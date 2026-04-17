package db

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"

	"nexia-backend/internal/config"

	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"go.uber.org/zap"
	"go.uber.org/zap/zaptest/observer"
	gormPostgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var workingDirMu sync.Mutex

func TestRunMigrationsAndNewAgainstPostgres(t *testing.T) {
	cfg, connStr := startPostgresForDBTests(t)
	withRepoRoot(t)

	logger := zap.NewNop()

	require.NoError(t, RunMigrations(cfg, logger))

	got, err := New(cfg, logger)
	require.NoError(t, err)
	require.Same(t, got, DB)

	sqlDB, err := got.DB()
	require.NoError(t, err)
	require.Equal(t, cfg.DB.MaxOpenConns, sqlDB.Stats().MaxOpenConnections)

	check := openRawDB(t, connStr)
	for _, table := range []string{"users", "profiles", "profile_embeddings", "schema_migrations"} {
		require.True(t, tableExists(t, check, table), table)
	}

	var hasVector bool
	require.NoError(t, check.Raw("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname='vector')").Scan(&hasVector).Error)
	require.True(t, hasVector)
}

func TestRunMigrationsDisabledSkipsWork(t *testing.T) {
	cfg, connStr := startPostgresForDBTests(t)
	cfg.DB.RunMigrations = false

	core, observed := observer.New(zap.InfoLevel)
	logger := zap.New(core)

	require.NoError(t, RunMigrations(cfg, logger))

	check := openRawDB(t, connStr)
	require.False(t, tableExists(t, check, "schema_migrations"))
	require.False(t, tableExists(t, check, "users"))

	entries := observed.AllUntimed()
	require.Len(t, entries, 1)
	require.Equal(t, "startup migrations disabled by config", entries[0].Message)
}

func startPostgresForDBTests(t *testing.T) (*config.Config, string) {
	t.Helper()

	ctx := context.Background()
	container, err := postgres.Run(ctx,
		"pgvector/pgvector:pg16",
		postgres.WithDatabase("nexia"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("secret"),
		postgres.BasicWaitStrategies(),
	)
	require.NoError(t, err)
	t.Cleanup(func() {
		_ = container.Terminate(ctx)
	})

	connStr, err := container.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	parsed, err := url.Parse(connStr)
	require.NoError(t, err)

	host, portStr, err := net.SplitHostPort(parsed.Host)
	require.NoError(t, err)

	password, ok := parsed.User.Password()
	require.True(t, ok)

	port := 0
	_, err = fmt.Sscanf(portStr, "%d", &port)
	require.NoError(t, err)

	cfg := &config.Config{
		Server: config.ServerConfig{Mode: "test"},
		DB: config.DBConfig{
			Host:                   host,
			Port:                   port,
			User:                   parsed.User.Username(),
			Password:               password,
			Name:                   strings.TrimPrefix(parsed.Path, "/"),
			SSLMode:                parsed.Query().Get("sslmode"),
			RunMigrations:          true,
			MaxIdleConns:           3,
			MaxOpenConns:           7,
			ConnMaxLifetimeMinutes: 5,
		},
	}

	return cfg, connStr
}

func withRepoRoot(t *testing.T) {
	t.Helper()

	workingDirMu.Lock()
	wd, err := os.Getwd()
	require.NoError(t, err)

	root := filepath.Clean(filepath.Join(wd, "..", ".."))
	require.NoError(t, os.Chdir(root))

	t.Cleanup(func() {
		if err := os.Chdir(wd); err != nil {
			t.Errorf("restore working directory: %v", err)
		}
		workingDirMu.Unlock()
	})
}

func openRawDB(t *testing.T, connStr string) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(gormPostgres.Open(connStr), &gorm.Config{})
	require.NoError(t, err)
	return db
}

func tableExists(t *testing.T, db *gorm.DB, table string) bool {
	t.Helper()

	var exists bool
	require.NoError(t, db.Raw(
		"SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=?)",
		table,
	).Scan(&exists).Error)
	return exists
}
