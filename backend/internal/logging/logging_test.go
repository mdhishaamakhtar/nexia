package logging

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"nexia-backend/internal/config"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"go.uber.org/zap/zaptest/observer"
	gormlogger "gorm.io/gorm/logger"
)

func testLogger(level zapcore.Level) (*zap.Logger, *observer.ObservedLogs) {
	core, logs := observer.New(level)
	return zap.New(core), logs
}

func TestNewLogger(t *testing.T) {
	cfg := &config.Config{Server: config.ServerConfig{Mode: "debug"}}
	logger, err := NewLogger(cfg)
	if err != nil {
		t.Fatalf("NewLogger returned error: %v", err)
	}
	if logger == nil {
		t.Fatal("expected logger")
	}
}

func TestZapWriterWrite(t *testing.T) {
	logger, logs := testLogger(zap.DebugLevel)
	writer := &zapWriter{logger: logger, level: zapLevelWarn}

	n, err := writer.Write([]byte(" warning message \n"))
	if err != nil {
		t.Fatalf("Write returned error: %v", err)
	}
	if n == 0 {
		t.Fatal("expected bytes written")
	}
	if logs.Len() != 1 || logs.All()[0].Level != zap.WarnLevel {
		t.Fatalf("expected one warn log, got %+v", logs.All())
	}

	n, err = writer.Write([]byte("   "))
	if err != nil {
		t.Fatalf("Write blank returned error: %v", err)
	}
	if n != 3 {
		t.Fatalf("expected blank write length, got %d", n)
	}
	if logs.Len() != 1 {
		t.Fatalf("expected blank write to skip logging, got %d entries", logs.Len())
	}
}

func TestNewAsynqLogger(t *testing.T) {
	t.Run("panic on nil logger", func(t *testing.T) {
		defer func() {
			if recover() == nil {
				t.Fatal("expected panic")
			}
		}()
		_ = NewAsynqLogger(nil)
	})

	logger, logs := testLogger(zap.DebugLevel)
	asynqLogger := NewAsynqLogger(logger).(*AsynqLogger)
	asynqLogger.Debug("debug")
	asynqLogger.Info("info")
	asynqLogger.Warn("warn")
	asynqLogger.Error("error")

	if logs.Len() != 4 {
		t.Fatalf("expected 4 log entries, got %d", logs.Len())
	}
}

func TestConfigureGin(t *testing.T) {
	t.Run("panic on nil logger", func(t *testing.T) {
		defer func() {
			if recover() == nil {
				t.Fatal("expected panic")
			}
		}()
		ConfigureGin(nil)
	})

	logger, logs := testLogger(zap.DebugLevel)
	oldWriter := gin.DefaultWriter
	oldErrorWriter := gin.DefaultErrorWriter
	oldRouteFunc := gin.DebugPrintRouteFunc
	defer func() {
		gin.DefaultWriter = oldWriter
		gin.DefaultErrorWriter = oldErrorWriter
		gin.DebugPrintRouteFunc = oldRouteFunc
	}()

	ConfigureGin(logger)
	_, _ = gin.DefaultWriter.Write([]byte("hello\n"))
	gin.DebugPrintRouteFunc("GET", "/healthz", "handler", 2)

	if logs.Len() < 2 {
		t.Fatalf("expected gin logs, got %d", logs.Len())
	}
}

func TestGormLoggerMethods(t *testing.T) {
	logger, logs := testLogger(zap.DebugLevel)
	gormLog := NewGormLogger(logger).(*GormLogger)

	gormLog.LogMode(gormlogger.Info).Info(context.Background(), "info", "x")
	gormLog.Warn(context.Background(), "warn", "y")
	gormLog.Error(context.Background(), "error", "z")
	gormLog.LogMode(gormlogger.Info).Trace(context.Background(), time.Now().Add(-10*time.Millisecond), func() (string, int64) {
		return "SELECT 1", 1
	}, nil)
	gormLog.Trace(context.Background(), time.Now().Add(-time.Second), func() (string, int64) {
		return "SELECT 1", 1
	}, nil)
	gormLog.Trace(context.Background(), time.Now(), func() (string, int64) {
		return strings.Repeat("x", 600), 1
	}, errors.New("db fail"))

	if logs.Len() < 5 {
		t.Fatalf("expected gorm logs, got %d", logs.Len())
	}
}

func TestTruncateSQL(t *testing.T) {
	if got := truncateSQL(" SELECT 1 ", 20); got != "SELECT 1" {
		t.Fatalf("unexpected short sql %q", got)
	}
	long := strings.Repeat("x", 10)
	if got := truncateSQL(long, 5); got != "xxxxx...(truncated)" {
		t.Fatalf("unexpected truncated sql %q", got)
	}
}
