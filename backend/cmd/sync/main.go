package main

import (
	"nexia-backend/internal/config"
	"nexia-backend/internal/logging"
	"nexia-backend/internal/models"
	"nexia-backend/internal/queue"
	"nexia-backend/pkg/db"

	"go.uber.org/zap"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		panic(err)
	}

	logger, err := logging.NewLogger(cfg)
	if err != nil {
		panic(err)
	}
	defer func() {
		_ = logger.Sync()
	}()

	if _, err := db.New(cfg, logger); err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}

	if cfg.AI.RedisURL == "" {
		logger.Fatal("redis url not configured; cannot sync embeddings")
	}
	queueClient := queue.NewQueueClient(cfg.AI.RedisURL, logger)
	defer queueClient.Close()

	logger.Info("starting profile embedding sync")

	// 4. Batch Process
	var page = 1
	var limit = 100
	var count int

	for {
		var profiles []models.Profile
		offset := (page - 1) * limit

		result := db.DB.Limit(limit).Offset(offset).Find(&profiles)
		if result.Error != nil {
			logger.Fatal("failed to fetch profiles", zap.Error(result.Error))
		}

		if len(profiles) == 0 {
			break
		}

		for _, p := range profiles {
			if err := queueClient.EnqueueEmbeddingTask(uint(p.ID)); err != nil {
				logger.Warn("failed to enqueue profile", zap.Uint64("profile_id", p.ID), zap.Error(err))
			} else {
				count++
			}
		}

		logger.Info("processed profile batch",
			zap.Int("page", page),
			zap.Int("enqueued_count", count),
		)
		page++
	}

	logger.Info("profile embedding sync completed", zap.Int("enqueued_count", count))
}
