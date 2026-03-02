package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

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
	Port             int      `mapstructure:"port"`
	Mode             string   `mapstructure:"mode"`
	JWTSecret        string   `mapstructure:"jwt_secret"`
	JWTExpiryMinutes int      `mapstructure:"jwt_expiry_minutes"`
	CORSOrigins      []string `mapstructure:"cors_origins"`
}

type DBConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	Name     string `mapstructure:"name"`
	SSLMode  string `mapstructure:"ssl_mode"`
}

func LoadConfig() (*Config, error) {
	viper.SetConfigName("local") // Default to local
	viper.SetConfigType("yaml")
	viper.AddConfigPath("config")

	// Check for environment variable to switch config
	viper.AutomaticEnv()
	if env := viper.GetString("APP_ENV"); env != "" {
		viper.SetConfigName(env)
	}

	// Environment variable override
	// e.g. NEXIA_DB_PASSWORD will override db.password
	viper.SetEnvPrefix("nexia")
	viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

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
