package queue

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"nexia-backend/internal/services"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"
)

// embeddingRunner is a local interface so TaskHandler can be tested without a real EmbeddingService.
type embeddingRunner interface {
	EmbedProfile(ctx context.Context, profileID uint) error
	DeleteEmbedding(ctx context.Context, profileID uint64) error
}

// TaskHandler processes task:embedding and task:deletion jobs from the Asynq queue.
type TaskHandler struct {
	svc    embeddingRunner
	logger *zap.Logger
}

// NewTaskHandler constructs a TaskHandler backed by the given EmbeddingService.
func NewTaskHandler(svc *services.EmbeddingService, logger *zap.Logger) *TaskHandler {
	return &TaskHandler{svc: svc, logger: logger.Named("queue_worker")}
}

// HandleEmbeddingTask processes a task:embedding job. Skips retry if the profile
// no longer exists (it was deleted before the worker ran).
func (h *TaskHandler) HandleEmbeddingTask(ctx context.Context, t *asynq.Task) error {
	var p EmbeddingPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	h.logger.Info("processing embedding task", zap.Uint("profile_id", p.ProfileID))

	if err := h.svc.EmbedProfile(ctx, p.ProfileID); err != nil {
		if errors.Is(err, services.ErrNotFound) {
			h.logger.Warn("embedding task skipped: profile not found", zap.Uint("profile_id", p.ProfileID))
			return asynq.SkipRetry
		}
		return err
	}

	h.logger.Info("embedding task completed", zap.Uint("profile_id", p.ProfileID))
	return nil
}

// HandleDeletionTask processes a task:deletion job, removing the profile's vector embedding.
func (h *TaskHandler) HandleDeletionTask(ctx context.Context, t *asynq.Task) error {
	var p DeletionPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	h.logger.Info("processing deletion task", zap.Uint64("profile_id", p.ProfileID))

	if err := h.svc.DeleteEmbedding(ctx, p.ProfileID); err != nil {
		return fmt.Errorf("deletion failed: %w", err)
	}

	h.logger.Info("deletion task completed", zap.Uint64("profile_id", p.ProfileID))
	return nil
}
