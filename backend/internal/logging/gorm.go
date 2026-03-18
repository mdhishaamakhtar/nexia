package logging

import (
	"context"
	"time"

	"go.uber.org/zap"
	gormlogger "gorm.io/gorm/logger"
)

type GormLogger struct {
	logger        *zap.Logger
	slowThreshold time.Duration
	logLevel      gormlogger.LogLevel
}

func NewGormLogger(logger *zap.Logger) gormlogger.Interface {
	return &GormLogger{
		logger:        logger.Named("gorm"),
		slowThreshold: 200 * time.Millisecond,
		logLevel:      gormlogger.Warn,
	}
}

func (g *GormLogger) LogMode(level gormlogger.LogLevel) gormlogger.Interface {
	next := *g
	next.logLevel = level
	return &next
}

func (g *GormLogger) Info(ctx context.Context, msg string, data ...interface{}) {
	if g.logLevel < gormlogger.Info {
		return
	}
	g.logger.Info(msg, zap.Any("data", data))
}

func (g *GormLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
	if g.logLevel < gormlogger.Warn {
		return
	}
	g.logger.Warn(msg, zap.Any("data", data))
}

func (g *GormLogger) Error(ctx context.Context, msg string, data ...interface{}) {
	if g.logLevel < gormlogger.Error {
		return
	}
	g.logger.Error(msg, zap.Any("data", data))
}

func (g *GormLogger) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
	if g.logLevel == gormlogger.Silent {
		return
	}

	sql, rows := fc()
	elapsed := time.Since(begin)
	fields := []zap.Field{
		zap.Duration("duration", elapsed),
		zap.Int64("rows", rows),
		zap.String("sql", sql),
	}

	switch {
	case err != nil && g.logLevel >= gormlogger.Error:
		g.logger.Error("db query failed", append(fields, zap.Error(err))...)
	case elapsed > g.slowThreshold && g.logLevel >= gormlogger.Warn:
		g.logger.Warn("db slow query", fields...)
	case g.logLevel >= gormlogger.Info:
		g.logger.Debug("db query", fields...)
	}
}
