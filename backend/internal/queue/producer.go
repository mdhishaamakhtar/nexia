package queue

import (
	"encoding/json"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"
)

const (
	TypeEmbeddingTask = "task:embedding"
	TypeDeletionTask  = "task:deletion"
)

type EmbeddingPayload struct {
	ProfileID uint `json:"profile_id"`
}

type DeletionPayload struct {
	ProfileID uint64 `json:"profile_id"`
}

type QueueClient struct {
	client *asynq.Client
	logger *zap.Logger
}

func ParseRedisOpt(redisURL string) asynq.RedisConnOpt {
	opt, err := asynq.ParseRedisURI(redisURL)
	if err != nil {
		return asynq.RedisClientOpt{Addr: redisURL}
	}
	return opt
}

func NewQueueClient(redisURL string, logger *zap.Logger) *QueueClient {
	client := asynq.NewClient(ParseRedisOpt(redisURL))
	return &QueueClient{client: client, logger: logger.Named("queue")}
}

func (c *QueueClient) EnqueueEmbeddingTask(profileID uint) error {
	payload, err := json.Marshal(EmbeddingPayload{ProfileID: profileID})
	if err != nil {
		return err
	}
	task := asynq.NewTask(TypeEmbeddingTask, payload)
	_, err = c.client.Enqueue(task)
	if err == nil {
		c.logger.Debug("enqueued embedding task", zap.Uint("profile_id", profileID))
	}
	return err
}

func (c *QueueClient) EnqueueDeletionTask(profileID uint64) error {
	payload, err := json.Marshal(DeletionPayload{ProfileID: profileID})
	if err != nil {
		return err
	}
	task := asynq.NewTask(TypeDeletionTask, payload)
	_, err = c.client.Enqueue(task)
	if err == nil {
		c.logger.Debug("enqueued deletion task", zap.Uint64("profile_id", profileID))
	}
	return err
}

func (c *QueueClient) Close() {
	c.client.Close()
}
