package logging

import (
	"context"
	"errors"
	"io"
	"os"
	"strings"
	"testing"
	"time"

	"nexia-backend/internal/config"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"go.uber.org/zap/zaptest/observer"
	gormlogger "gorm.io/gorm/logger"
)

func TestZapWriterWrite(t *testing.T) {
	t.Run("writes trimmed info log", func(t *testing.T) {
		core, observed := observer.New(zap.DebugLevel)
		writer := &zapWriter{logger: zap.New(core), level: zapLevelInfo}

		n, err := writer.Write([]byte("  hello world \n"))
		require.NoError(t, err)
		require.Equal(t, len("  hello world \n"), n)

		entries := observed.AllUntimed()
		require.Len(t, entries, 1)
		require.Equal(t, zap.InfoLevel, entries[0].Level)
		require.Equal(t, "hello world", entries[0].Message)
	})

	t.Run("routes warn and error levels correctly", func(t *testing.T) {
		core, observed := observer.New(zap.DebugLevel)
		logger := zap.New(core)

		_, _ = (&zapWriter{logger: logger, level: zapLevelWarn}).Write([]byte("warn"))
		_, _ = (&zapWriter{logger: logger, level: zapLevelError}).Write([]byte("error"))

		entries := observed.AllUntimed()
		require.Len(t, entries, 2)
		require.Equal(t, zap.WarnLevel, entries[0].Level)
		require.Equal(t, "warn", entries[0].Message)
		require.Equal(t, zap.ErrorLevel, entries[1].Level)
		require.Equal(t, "error", entries[1].Message)
	})

	t.Run("ignores blank messages", func(t *testing.T) {
		core, observed := observer.New(zap.DebugLevel)
		writer := &zapWriter{logger: zap.New(core), level: zapLevelInfo}

		n, err := writer.Write([]byte("   \n\t"))
		require.NoError(t, err)
		require.Equal(t, len("   \n\t"), n)
		require.Zero(t, observed.Len())
	})
}

func TestNewAsynqLogger(t *testing.T) {
	t.Run("panics when logger is nil", func(t *testing.T) {
		require.Panics(t, func() {
			_ = NewAsynqLogger(nil)
		})
	})

	t.Run("emits messages at matching levels", func(t *testing.T) {
		core, observed := observer.New(zap.DebugLevel)
		logger := NewAsynqLogger(zap.New(core))

		logger.Debug("debug message")
		logger.Info("info message")
		logger.Warn("warn message")
		logger.Error("error message")

		entries := observed.AllUntimed()
		require.Len(t, entries, 4)

		want := []struct {
			level zapcore.Level
			msg   string
		}{
			{zap.DebugLevel, "debug message"},
			{zap.InfoLevel, "info message"},
			{zap.WarnLevel, "warn message"},
			{zap.ErrorLevel, "error message"},
		}

		for i, entry := range entries {
			require.Equal(t, want[i].level, entry.Level)
			require.Equal(t, want[i].msg, entry.Message)
		}
	})
}

func TestConfigureGin(t *testing.T) {
	t.Run("panics when logger is nil", func(t *testing.T) {
		require.Panics(t, func() {
			ConfigureGin(nil)
		})
	})

	t.Run("wires gin globals to zap logger", func(t *testing.T) {
		oldWriter := gin.DefaultWriter
		oldErrorWriter := gin.DefaultErrorWriter
		oldRouteFunc := gin.DebugPrintRouteFunc
		t.Cleanup(func() {
			gin.DefaultWriter = oldWriter
			gin.DefaultErrorWriter = oldErrorWriter
			gin.DebugPrintRouteFunc = oldRouteFunc
		})

		core, observed := observer.New(zap.DebugLevel)
		ConfigureGin(zap.New(core))

		infoWriter, ok := gin.DefaultWriter.(*zapWriter)
		require.True(t, ok)

		errorWriter, ok := gin.DefaultErrorWriter.(*zapWriter)
		require.True(t, ok)

		_, _ = infoWriter.Write([]byte("request completed\n"))
		_, _ = errorWriter.Write([]byte("request failed\n"))
		gin.DebugPrintRouteFunc("GET", "/health", "handler", 3)

		entries := observed.AllUntimed()
		require.Len(t, entries, 3)
		require.Equal(t, zap.InfoLevel, entries[0].Level)
		require.Equal(t, "request completed", entries[0].Message)
		require.Equal(t, zap.ErrorLevel, entries[1].Level)
		require.Equal(t, "request failed", entries[1].Message)
		require.Equal(t, zap.DebugLevel, entries[2].Level)
		require.Equal(t, "route registered", entries[2].Message)

		ctx := entries[2].ContextMap()
		require.Equal(t, "GET", ctx["method"])
		require.Equal(t, "/health", ctx["path"])
		require.Equal(t, "handler", ctx["handler"])
		require.Equal(t, int64(3), ctx["handlers"])
	})
}

func TestGormLoggerLogModeAndTrace(t *testing.T) {
	t.Run("LogMode returns independent logger with updated level", func(t *testing.T) {
		core, observed := observer.New(zap.DebugLevel)
		base := NewGormLogger(zap.New(core)).(*GormLogger)
		infoLogger := base.LogMode(gormlogger.Info).(*GormLogger)
		errorLogger := base.LogMode(gormlogger.Error).(*GormLogger)

		base.Info(context.Background(), "base info")
		infoLogger.Info(context.Background(), "info enabled", "x")
		infoLogger.Warn(context.Background(), "warn enabled", "y")
		errorLogger.Error(context.Background(), "error enabled", "z")

		entries := observed.AllUntimed()
		require.Len(t, entries, 3)

		want := []struct {
			level zapcore.Level
			msg   string
		}{
			{zap.InfoLevel, "info enabled"},
			{zap.WarnLevel, "warn enabled"},
			{zap.ErrorLevel, "error enabled"},
		}
		for i, entry := range entries {
			require.Equal(t, want[i].level, entry.Level)
			require.Equal(t, want[i].msg, entry.Message)
		}
	})

	t.Run("Trace logs errors with truncated SQL", func(t *testing.T) {
		core, observed := observer.New(zap.DebugLevel)
		logger := NewGormLogger(zap.New(core)).(*GormLogger)
		logger = logger.LogMode(gormlogger.Error).(*GormLogger)

		longSQL := strings.Repeat("SELECT 1 ", 80)
		logger.Trace(context.Background(), time.Now(), func() (string, int64) {
			return longSQL, 3
		}, errors.New("db down"))

		entries := observed.AllUntimed()
		require.Len(t, entries, 1)
		require.Equal(t, zap.ErrorLevel, entries[0].Level)
		require.Equal(t, "db query failed", entries[0].Message)

		sqlValue, ok := entries[0].ContextMap()["sql"].(string)
		require.True(t, ok)
		require.True(t, strings.HasSuffix(sqlValue, "...(truncated)"))
	})

	t.Run("Trace logs slow queries at warn level", func(t *testing.T) {
		core, observed := observer.New(zap.DebugLevel)
		logger := NewGormLogger(zap.New(core)).(*GormLogger)

		logger.Trace(context.Background(), time.Now().Add(-time.Second), func() (string, int64) {
			return "SELECT 1", 2
		}, nil)

		entries := observed.AllUntimed()
		require.Len(t, entries, 1)
		require.Equal(t, zap.WarnLevel, entries[0].Level)
		require.Equal(t, "db slow query", entries[0].Message)
	})

	t.Run("Trace logs fast queries only when info logging is enabled", func(t *testing.T) {
		core, observed := observer.New(zap.DebugLevel)
		logger := NewGormLogger(zap.New(core)).(*GormLogger)
		logger = logger.LogMode(gormlogger.Info).(*GormLogger)

		logger.Trace(context.Background(), time.Now(), func() (string, int64) {
			return "SELECT 1", 1
		}, nil)

		entries := observed.AllUntimed()
		require.Len(t, entries, 1)
		require.Equal(t, zap.DebugLevel, entries[0].Level)
		require.Equal(t, "db query completed", entries[0].Message)
	})

	t.Run("Trace is silent when log level is silent", func(t *testing.T) {
		core, observed := observer.New(zap.DebugLevel)
		logger := NewGormLogger(zap.New(core)).(*GormLogger)
		logger = logger.LogMode(gormlogger.Silent).(*GormLogger)

		logger.Trace(context.Background(), time.Now().Add(-time.Second), func() (string, int64) {
			return "SELECT 1", 1
		}, errors.New("ignored"))

		require.Zero(t, observed.Len())
	})
}

func TestNewLogger(t *testing.T) {
	t.Run("uses debug level outside release mode and emits structured fields", func(t *testing.T) {
		oldStdout := os.Stdout
		r, w, err := os.Pipe()
		require.NoError(t, err)
		os.Stdout = w
		t.Cleanup(func() {
			os.Stdout = oldStdout
		})

		logger, err := NewLogger(&config.Config{Server: config.ServerConfig{Mode: "test"}})
		require.NoError(t, err)
		require.True(t, logger.Core().Enabled(zap.DebugLevel))

		logger.Info("hello")
		_ = logger.Sync()
		_ = w.Close()

		out, err := io.ReadAll(r)
		require.NoError(t, err)

		text := string(out)
		for _, want := range []string{`"msg":"hello"`, `"service":"nexia-backend"`, `"env":"test"`} {
			require.Contains(t, text, want)
		}
	})

	t.Run("disables debug level in release mode", func(t *testing.T) {
		logger, err := NewLogger(&config.Config{Server: config.ServerConfig{Mode: "release"}})
		require.NoError(t, err)
		require.False(t, logger.Core().Enabled(zap.DebugLevel))
	})
}
