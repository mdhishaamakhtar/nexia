package config_test

import (
	"os"
	"path/filepath"
	"testing"

	"nexia-backend/internal/config"

	"github.com/spf13/viper"
	"github.com/stretchr/testify/require"
)

func TestLoadConfigFromEnvAndFile(t *testing.T) {
	tmp := t.TempDir()
	configDir := filepath.Join(tmp, "config")
	require.NoError(t, os.MkdirAll(configDir, 0o755))

	localYAML := `server:
  port: 9999
  mode: test
  jwt_secret: "local-secret"
  jwt_expiry_minutes: 5
  cors_origins: ["http://localhost:3000"]
db:
  host: localhost
  port: 5432
  user: postgres
  password: pass
  name: db
  ssl_mode: disable
  run_migrations: true
  max_idle_conns: 10
  max_open_conns: 50
  conn_max_lifetime_minutes: 60
ai:
  gemini_api_key: ""
  redis_url: ""
`
	require.NoError(t, os.WriteFile(filepath.Join(configDir, "local.yaml"), []byte(localYAML), 0o644))

	prodYAML := `server:
  port: 8080
  mode: release
  jwt_secret: "prod-secret"
  jwt_expiry_minutes: 60
  cors_origins: ["https://example.com"]
db:
  host: prod-db
  port: 5432
  user: postgres
  password: pass
  name: prod
  ssl_mode: require
  run_migrations: false
  max_idle_conns: 15
  max_open_conns: 75
  conn_max_lifetime_minutes: 120
ai:
  gemini_api_key: "prod-key"
  redis_url: "redis:6379"
`
	require.NoError(t, os.WriteFile(filepath.Join(configDir, "prod.yaml"), []byte(prodYAML), 0o644))

	cwd, err := os.Getwd()
	require.NoError(t, err)
	require.NoError(t, os.Chdir(tmp))
	t.Cleanup(func() {
		_ = os.Chdir(cwd)
	})

	viper.Reset()
	t.Setenv("APP_ENV", "")
	t.Setenv("NEXIA_DB_PASSWORD", "override-pass")
	t.Setenv("NEXIA_DB_MAX_OPEN_CONNS", "80")
	cfg, err := config.LoadConfig()
	require.NoError(t, err)
	require.Equal(t, 9999, cfg.Server.Port)
	require.Equal(t, "override-pass", cfg.DB.Password)
	require.True(t, cfg.DB.RunMigrations)
	require.Equal(t, 10, cfg.DB.MaxIdleConns)
	require.Equal(t, 80, cfg.DB.MaxOpenConns)
	require.Equal(t, 60, cfg.DB.ConnMaxLifetimeMinutes)

	viper.Reset()
	t.Setenv("APP_ENV", "prod")
	t.Setenv("NEXIA_DB_PASSWORD", "")
	t.Setenv("NEXIA_DB_MAX_OPEN_CONNS", "")
	cfg, err = config.LoadConfig()
	require.NoError(t, err)
	require.Equal(t, "release", cfg.Server.Mode)
	require.Equal(t, "prod-db", cfg.DB.Host)
	require.False(t, cfg.DB.RunMigrations)
	require.Equal(t, 15, cfg.DB.MaxIdleConns)
	require.Equal(t, 75, cfg.DB.MaxOpenConns)
	require.Equal(t, 120, cfg.DB.ConnMaxLifetimeMinutes)
}

func TestLoadConfigDBPoolDefaults(t *testing.T) {
	tmp := t.TempDir()
	configDir := filepath.Join(tmp, "config")
	require.NoError(t, os.MkdirAll(configDir, 0o755))

	localYAML := `server:
  port: 9999
  mode: test
  jwt_secret: "local-secret"
  jwt_expiry_minutes: 5
  cors_origins: ["http://localhost:3000"]
db:
  host: localhost
  port: 5432
  user: postgres
  password: pass
  name: db
  ssl_mode: disable
ai:
  gemini_api_key: ""
  redis_url: ""
`
	require.NoError(t, os.WriteFile(filepath.Join(configDir, "local.yaml"), []byte(localYAML), 0o644))

	cwd, err := os.Getwd()
	require.NoError(t, err)
	require.NoError(t, os.Chdir(tmp))
	t.Cleanup(func() {
		_ = os.Chdir(cwd)
	})

	viper.Reset()
	cfg, err := config.LoadConfig()
	require.NoError(t, err)
	require.True(t, cfg.DB.RunMigrations)
	require.Equal(t, 10, cfg.DB.MaxIdleConns)
	require.Equal(t, 50, cfg.DB.MaxOpenConns)
	require.Equal(t, 60, cfg.DB.ConnMaxLifetimeMinutes)
}

func TestLoadConfigMissingFile(t *testing.T) {
	tmp := t.TempDir()
	cwd, err := os.Getwd()
	require.NoError(t, err)
	require.NoError(t, os.Chdir(tmp))
	t.Cleanup(func() {
		_ = os.Chdir(cwd)
	})

	viper.Reset()
	_, err = config.LoadConfig()
	require.Error(t, err)
}
