package queue

import (
	"encoding/json"

	"github.com/hibiken/asynq"
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
}

func ParseRedisOpt(redisURL string) asynq.RedisConnOpt {
	opt, err := asynq.ParseRedisURI(redisURL)
	if err != nil {
		return asynq.RedisClientOpt{Addr: redisURL}
	}
	return opt
}

func NewQueueClient(redisURL string) *QueueClient {
	client := asynq.NewClient(ParseRedisOpt(redisURL))
	return &QueueClient{client: client}
}

func (c *QueueClient) EnqueueEmbeddingTask(profileID uint) error {
	payload, err := json.Marshal(EmbeddingPayload{ProfileID: profileID})
	if err != nil {
		return err
	}
	task := asynq.NewTask(TypeEmbeddingTask, payload)
	_, err = c.client.Enqueue(task)
	return err
}

func (c *QueueClient) EnqueueDeletionTask(profileID uint64) error {
	payload, err := json.Marshal(DeletionPayload{ProfileID: profileID})
	if err != nil {
		return err
	}
	task := asynq.NewTask(TypeDeletionTask, payload)
	_, err = c.client.Enqueue(task)
	return err
}

func (c *QueueClient) Close() {
	c.client.Close()
}
