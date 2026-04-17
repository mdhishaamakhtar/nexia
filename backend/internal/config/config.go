package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

// Config is the top-level application configuration loaded from a YAML file
// and overridable via NEXIA_-prefixed environment variables.
type Config struct {
	Server ServerConfig `mapstructure:"server"`
	DB     DBConfig     `mapstructure:"db"`
	AI     AIConfig     `mapstructure:"ai"`
	Email  EmailConfig  `mapstructure:"email"`
}

type EmailConfig struct {
	ResendAPIKey string `mapstructure:"resend_api_key"`
	FromAddress  string `mapstructure:"from_address"`
	AppBaseURL   string `mapstructure:"app_base_url"`
}

type AIConfig struct {
	GeminiAPIKey string `mapstructure:"gemini_api_key"`
	RedisURL     string `mapstructure:"redis_url"`
}

type ServerConfig struct {
	Port                       int      `mapstructure:"port"`
	Mode                       string   `mapstructure:"mode"`
	JWTSecret                  string   `mapstructure:"jwt_secret"`
	JWTExpiryMinutes           int      `mapstructure:"jwt_expiry_minutes"`
	CORSOrigins                []string `mapstructure:"cors_origins"`
	CookieDomain               string   `mapstructure:"cookie_domain"`
	AuthRateLimitRequests      int      `mapstructure:"auth_rate_limit_requests"`
	AuthRateLimitWindowSeconds int      `mapstructure:"auth_rate_limit_window_seconds"`
	AuthRateLimitBurst         int      `mapstructure:"auth_rate_limit_burst"`
	ChatRateLimitRequests      int      `mapstructure:"chat_rate_limit_requests"`
	ChatRateLimitWindowSeconds int      `mapstructure:"chat_rate_limit_window_seconds"`
	ChatRateLimitBurst         int      `mapstructure:"chat_rate_limit_burst"`
}

type DBConfig struct {
	Host                   string `mapstructure:"host"`
	Port                   int    `mapstructure:"port"`
	User                   string `mapstructure:"user"`
	Password               string `mapstructure:"password"`
	Name                   string `mapstructure:"name"`
	SSLMode                string `mapstructure:"ssl_mode"`
	RunMigrations          bool   `mapstructure:"run_migrations"`
	MaxIdleConns           int    `mapstructure:"max_idle_conns"`
	MaxOpenConns           int    `mapstructure:"max_open_conns"`
	ConnMaxLifetimeMinutes int    `mapstructure:"conn_max_lifetime_minutes"`
}

// LoadConfig reads the YAML config file matching the APP_ENV environment variable
// (defaults to "local") and applies NEXIA_-prefixed env var overrides.
// For example, NEXIA_DB_PASSWORD overrides db.password.
func LoadConfig() (*Config, error) {
	viper.SetConfigName("local")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("config")

	viper.AutomaticEnv()
	if env := viper.GetString("APP_ENV"); env != "" {
		viper.SetConfigName(env)
	}

	viper.SetEnvPrefix("nexia")
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	viper.SetDefault("db.run_migrations", true)
	viper.SetDefault("db.max_idle_conns", 10)
	viper.SetDefault("db.max_open_conns", 50)
	viper.SetDefault("db.conn_max_lifetime_minutes", 60)

	if err := viper.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("failed to read config: %w", err)
	}

	// viper.GetStringSlice correctly splits comma-separated env var values into a slice,
	// while viper.Unmarshal does not. Force the resolved slice back so Unmarshal sees it.
	viper.Set("server.cors_origins", viper.GetStringSlice("server.cors_origins"))

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	return &cfg, nil
}
