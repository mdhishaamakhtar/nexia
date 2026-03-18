package config_test

import (
	"os"
	"path/filepath"
	"testing"

	"nexia-backend/internal/config"

	"github.com/spf13/viper"
)

func TestLoadConfigFromEnvAndFile(t *testing.T) {
	tmp := t.TempDir()
	configDir := filepath.Join(tmp, "config")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatalf("mkdir config: %v", err)
	}

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
	if err := os.WriteFile(filepath.Join(configDir, "local.yaml"), []byte(localYAML), 0o644); err != nil {
		t.Fatalf("write local config: %v", err)
	}

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
	if err := os.WriteFile(filepath.Join(configDir, "prod.yaml"), []byte(prodYAML), 0o644); err != nil {
		t.Fatalf("write prod config: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(tmp); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() {
		_ = os.Chdir(cwd)
	})

	viper.Reset()
	t.Setenv("APP_ENV", "")
	t.Setenv("NEXIA_DB_PASSWORD", "override-pass")
	t.Setenv("NEXIA_DB_MAX_OPEN_CONNS", "80")
	cfg, err := config.LoadConfig()
	if err != nil {
		t.Fatalf("load local config: %v", err)
	}
	if cfg.Server.Port != 9999 {
		t.Fatalf("expected local port 9999 got %d", cfg.Server.Port)
	}
	if cfg.DB.Password != "override-pass" {
		t.Fatalf("expected env override password, got %s", cfg.DB.Password)
	}
	if !cfg.DB.RunMigrations {
		t.Fatalf("expected local run_migrations=true")
	}
	if cfg.DB.MaxIdleConns != 10 {
		t.Fatalf("expected local max_idle_conns=10 got %d", cfg.DB.MaxIdleConns)
	}
	if cfg.DB.MaxOpenConns != 80 {
		t.Fatalf("expected env override max_open_conns=80 got %d", cfg.DB.MaxOpenConns)
	}
	if cfg.DB.ConnMaxLifetimeMinutes != 60 {
		t.Fatalf("expected local conn_max_lifetime_minutes=60 got %d", cfg.DB.ConnMaxLifetimeMinutes)
	}

	viper.Reset()
	t.Setenv("APP_ENV", "prod")
	t.Setenv("NEXIA_DB_PASSWORD", "")
	t.Setenv("NEXIA_DB_MAX_OPEN_CONNS", "")
	cfg, err = config.LoadConfig()
	if err != nil {
		t.Fatalf("load prod config: %v", err)
	}
	if cfg.Server.Mode != "release" {
		t.Fatalf("expected prod mode release got %s", cfg.Server.Mode)
	}
	if cfg.DB.Host != "prod-db" {
		t.Fatalf("expected prod-db got %s", cfg.DB.Host)
	}
	if cfg.DB.RunMigrations {
		t.Fatalf("expected prod run_migrations=false")
	}
	if cfg.DB.MaxIdleConns != 15 {
		t.Fatalf("expected prod max_idle_conns=15 got %d", cfg.DB.MaxIdleConns)
	}
	if cfg.DB.MaxOpenConns != 75 {
		t.Fatalf("expected prod max_open_conns=75 got %d", cfg.DB.MaxOpenConns)
	}
	if cfg.DB.ConnMaxLifetimeMinutes != 120 {
		t.Fatalf("expected prod conn_max_lifetime_minutes=120 got %d", cfg.DB.ConnMaxLifetimeMinutes)
	}
}

func TestLoadConfigDBPoolDefaults(t *testing.T) {
	tmp := t.TempDir()
	configDir := filepath.Join(tmp, "config")
	if err := os.MkdirAll(configDir, 0o755); err != nil {
		t.Fatalf("mkdir config: %v", err)
	}

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
	if err := os.WriteFile(filepath.Join(configDir, "local.yaml"), []byte(localYAML), 0o644); err != nil {
		t.Fatalf("write local config: %v", err)
	}

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(tmp); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() {
		_ = os.Chdir(cwd)
	})

	viper.Reset()
	cfg, err := config.LoadConfig()
	if err != nil {
		t.Fatalf("load config: %v", err)
	}
	if !cfg.DB.RunMigrations {
		t.Fatalf("expected default run_migrations=true")
	}
	if cfg.DB.MaxIdleConns != 10 {
		t.Fatalf("expected default max_idle_conns=10 got %d", cfg.DB.MaxIdleConns)
	}
	if cfg.DB.MaxOpenConns != 50 {
		t.Fatalf("expected default max_open_conns=50 got %d", cfg.DB.MaxOpenConns)
	}
	if cfg.DB.ConnMaxLifetimeMinutes != 60 {
		t.Fatalf("expected default conn_max_lifetime_minutes=60 got %d", cfg.DB.ConnMaxLifetimeMinutes)
	}
}

func TestLoadConfigMissingFile(t *testing.T) {
	tmp := t.TempDir()
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(tmp); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() {
		_ = os.Chdir(cwd)
	})

	viper.Reset()
	if _, err := config.LoadConfig(); err == nil {
		t.Fatal("expected error when config file is missing")
	}
}
