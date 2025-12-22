package queue

import (
	"encoding/json"

	"github.com/hibiken/asynq"
)

const (
	TypeEmbeddingTask = "task:embedding"
)

type EmbeddingPayload struct {
	ProfileID uint `json:"profile_id"`
}

type QueueClient struct {
	client *asynq.Client
}

func NewQueueClient(redisAddr string) *QueueClient {
	client := asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr})
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

func (c *QueueClient) Close() {
	c.client.Close()
}
