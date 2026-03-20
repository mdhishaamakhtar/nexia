package queue

import (
	"encoding/json"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"
)

// Asynq task type identifiers used by both the producer and consumer.
const (
	TypeEmbeddingTask = "task:embedding"
	TypeDeletionTask  = "task:deletion"
)

// EmbeddingPayload is the JSON body of a task:embedding task.
type EmbeddingPayload struct {
	ProfileID uint `json:"profile_id"`
}

// DeletionPayload is the JSON body of a task:deletion task.
type DeletionPayload struct {
	ProfileID uint64 `json:"profile_id"`
}

// QueueClient wraps an Asynq client to enqueue background embedding jobs.
type QueueClient struct {
	client asynqEnqueuer
	logger *zap.Logger
}

type asynqEnqueuer interface {
	Enqueue(*asynq.Task, ...asynq.Option) (*asynq.TaskInfo, error)
	Close() error
}

var newAsynqClient = func(opt asynq.RedisConnOpt) asynqEnqueuer {
	return asynq.NewClient(opt)
}

// ParseRedisOpt parses a Redis URL into an Asynq connection option.
// Falls back to treating the string as a plain host:port address if parsing fails.
func ParseRedisOpt(redisURL string) asynq.RedisConnOpt {
	opt, err := asynq.ParseRedisURI(redisURL)
	if err != nil {
		return asynq.RedisClientOpt{Addr: redisURL}
	}
	return opt
}

// NewQueueClient constructs a QueueClient connected to the given Redis URL.
func NewQueueClient(redisURL string, logger *zap.Logger) *QueueClient {
	client := newAsynqClient(ParseRedisOpt(redisURL))
	return newQueueClientWithClient(client, logger)
}

func newQueueClientWithClient(client asynqEnqueuer, logger *zap.Logger) *QueueClient {
	return &QueueClient{client: client, logger: logger.Named("queue")}
}

// EnqueueEmbeddingTask submits a task:embedding job for the given profile.
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

// EnqueueDeletionTask submits a task:deletion job to remove the vector embedding for the profile.
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

// Close shuts down the underlying Asynq client connection.
func (c *QueueClient) Close() {
	_ = c.client.Close()
}
