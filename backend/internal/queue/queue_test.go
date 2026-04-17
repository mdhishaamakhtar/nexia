package queue

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"nexia-backend/internal/services"

	"github.com/hibiken/asynq"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

type fakeEnqueuer struct {
	tasks  []*asynq.Task
	err    error
	closed bool
}

func (f *fakeEnqueuer) Enqueue(task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error) {
	f.tasks = append(f.tasks, task)
	if f.err != nil {
		return nil, f.err
	}
	return &asynq.TaskInfo{ID: "task"}, nil
}

func (f *fakeEnqueuer) Close() error {
	f.closed = true
	return nil
}

type fakeEmbeddingRunner struct {
	embedErr  error
	deleteErr error
	embedded  []uint
	deleted   []uint64
}

func (f *fakeEmbeddingRunner) EmbedProfile(_ context.Context, profileID uint) error {
	f.embedded = append(f.embedded, profileID)
	return f.embedErr
}

func (f *fakeEmbeddingRunner) DeleteEmbedding(_ context.Context, profileID uint64) error {
	f.deleted = append(f.deleted, profileID)
	return f.deleteErr
}

func TestParseRedisOpt(t *testing.T) {
	require.NotNil(t, ParseRedisOpt("redis://localhost:6379/0"))
	require.NotNil(t, ParseRedisOpt("localhost:6379"))
}

func TestQueueClientEnqueueAndClose(t *testing.T) {
	fake := &fakeEnqueuer{}
	client := newQueueClientWithClient(fake, zap.NewNop())

	require.NoError(t, client.EnqueueEmbeddingTask(7))
	require.NoError(t, client.EnqueueDeletionTask(11))
	require.Len(t, fake.tasks, 2)

	var embeddingPayload EmbeddingPayload
	require.NoError(t, json.Unmarshal(fake.tasks[0].Payload(), &embeddingPayload))
	require.Equal(t, uint(7), embeddingPayload.ProfileID)

	var deletionPayload DeletionPayload
	require.NoError(t, json.Unmarshal(fake.tasks[1].Payload(), &deletionPayload))
	require.Equal(t, uint64(11), deletionPayload.ProfileID)

	client.Close()
	require.True(t, fake.closed)
}

func TestNewQueueClient(t *testing.T) {
	old := newAsynqClient
	defer func() { newAsynqClient = old }()

	fake := &fakeEnqueuer{}
	newAsynqClient = func(opt asynq.RedisConnOpt) asynqEnqueuer {
		return fake
	}

	client := NewQueueClient("redis://localhost:6379/0", zap.NewNop())
	require.NotNil(t, client)
	require.Same(t, fake, client.client)
}

func TestTaskHandlerEmbeddingTask(t *testing.T) {
	runner := &fakeEmbeddingRunner{}
	handler := &TaskHandler{svc: runner, logger: zap.NewNop()}

	payload, err := json.Marshal(EmbeddingPayload{ProfileID: 7})
	require.NoError(t, err)
	require.NoError(t, handler.HandleEmbeddingTask(context.Background(), asynq.NewTask(TypeEmbeddingTask, payload)))
	require.Equal(t, []uint{7}, runner.embedded)
}

func TestTaskHandlerEmbeddingTaskErrors(t *testing.T) {
	t.Run("invalid payload skips retry", func(t *testing.T) {
		handler := &TaskHandler{svc: &fakeEmbeddingRunner{}, logger: zap.NewNop()}
		err := handler.HandleEmbeddingTask(context.Background(), asynq.NewTask(TypeEmbeddingTask, []byte("bad")))
		require.ErrorIs(t, err, asynq.SkipRetry)
	})

	t.Run("ErrNotFound skips retry", func(t *testing.T) {
		handler := &TaskHandler{svc: &fakeEmbeddingRunner{embedErr: services.ErrNotFound}, logger: zap.NewNop()}
		payload, err := json.Marshal(EmbeddingPayload{ProfileID: 1})
		require.NoError(t, err)
		err = handler.HandleEmbeddingTask(context.Background(), asynq.NewTask(TypeEmbeddingTask, payload))
		require.ErrorIs(t, err, asynq.SkipRetry)
	})

	t.Run("other error propagated", func(t *testing.T) {
		handler := &TaskHandler{svc: &fakeEmbeddingRunner{embedErr: errors.New("transient failure")}, logger: zap.NewNop()}
		payload, err := json.Marshal(EmbeddingPayload{ProfileID: 1})
		require.NoError(t, err)
		require.Error(t, handler.HandleEmbeddingTask(context.Background(), asynq.NewTask(TypeEmbeddingTask, payload)))
	})
}

func TestTaskHandlerDeletionTask(t *testing.T) {
	runner := &fakeEmbeddingRunner{}
	handler := &TaskHandler{svc: runner, logger: zap.NewNop()}

	payload, err := json.Marshal(DeletionPayload{ProfileID: 22})
	require.NoError(t, err)
	require.NoError(t, handler.HandleDeletionTask(context.Background(), asynq.NewTask(TypeDeletionTask, payload)))
	require.Equal(t, []uint64{22}, runner.deleted)
}

func TestTaskHandlerDeletionTaskErrors(t *testing.T) {
	t.Run("invalid payload skips retry", func(t *testing.T) {
		handler := &TaskHandler{svc: &fakeEmbeddingRunner{}, logger: zap.NewNop()}
		err := handler.HandleDeletionTask(context.Background(), asynq.NewTask(TypeDeletionTask, []byte("bad")))
		require.ErrorIs(t, err, asynq.SkipRetry)
	})

	t.Run("deletion error propagated", func(t *testing.T) {
		handler := &TaskHandler{svc: &fakeEmbeddingRunner{deleteErr: errors.New("delete failed")}, logger: zap.NewNop()}
		payload, err := json.Marshal(DeletionPayload{ProfileID: 4})
		require.NoError(t, err)
		require.Error(t, handler.HandleDeletionTask(context.Background(), asynq.NewTask(TypeDeletionTask, payload)))
	})
}
