package logging

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"go.uber.org/zap"
)

type zapWriter struct {
	logger *zap.Logger
	level  zapcoreLevel
}

type zapcoreLevel int

const (
	zapLevelInfo zapcoreLevel = iota
	zapLevelWarn
	zapLevelError
)

func (w *zapWriter) Write(p []byte) (int, error) {
	msg := strings.TrimSpace(string(p))
	if msg == "" {
		return len(p), nil
	}

	switch w.level {
	case zapLevelError:
		w.logger.Error(msg)
	case zapLevelWarn:
		w.logger.Warn(msg)
	default:
		w.logger.Info(msg)
	}

	return len(p), nil
}

type AsynqLogger struct {
	logger *zap.Logger
}

func NewAsynqLogger(logger *zap.Logger) asynq.Logger {
	if logger == nil {
		panic("asynq logger requires a logger")
	}
	return &AsynqLogger{logger: logger.Named("asynq")}
}

func (l *AsynqLogger) Debug(args ...any) {
	l.logger.Debug(fmt.Sprint(args...))
}

func (l *AsynqLogger) Info(args ...any) {
	l.logger.Info(fmt.Sprint(args...))
}

func (l *AsynqLogger) Warn(args ...any) {
	l.logger.Warn(fmt.Sprint(args...))
}

func (l *AsynqLogger) Error(args ...any) {
	l.logger.Error(fmt.Sprint(args...))
}

func (l *AsynqLogger) Fatal(args ...any) {
	l.logger.Fatal(fmt.Sprint(args...))
}

func ConfigureGin(logger *zap.Logger) {
	if logger == nil {
		panic("gin logging requires a logger")
	}

	ginLogger := logger.Named("gin")
	gin.DefaultWriter = &zapWriter{logger: ginLogger, level: zapLevelInfo}
	gin.DefaultErrorWriter = &zapWriter{logger: ginLogger, level: zapLevelError}
	gin.DebugPrintRouteFunc = func(method, path, handler string, numHandlers int) {
		ginLogger.Debug("route registered",
			zap.String("method", method),
			zap.String("path", path),
			zap.String("handler", handler),
			zap.Int("handlers", numHandlers),
		)
	}
}
