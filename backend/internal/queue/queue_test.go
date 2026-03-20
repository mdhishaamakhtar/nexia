package queue

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"nexia-backend/internal/services"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"
)

// --- Producer fakes ---

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

// --- Handler fake ---

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

// --- Producer tests ---

func TestParseRedisOpt(t *testing.T) {
	if got := ParseRedisOpt("redis://localhost:6379/0"); got == nil {
		t.Fatal("expected parsed redis opt")
	}
	if got := ParseRedisOpt("localhost:6379"); got == nil {
		t.Fatal("expected fallback redis opt")
	}
}

func TestQueueClientEnqueueAndClose(t *testing.T) {
	fake := &fakeEnqueuer{}
	client := newQueueClientWithClient(fake, zap.NewNop())

	if err := client.EnqueueEmbeddingTask(7); err != nil {
		t.Fatalf("EnqueueEmbeddingTask returned error: %v", err)
	}
	if err := client.EnqueueDeletionTask(11); err != nil {
		t.Fatalf("EnqueueDeletionTask returned error: %v", err)
	}
	if len(fake.tasks) != 2 {
		t.Fatalf("expected 2 tasks, got %d", len(fake.tasks))
	}

	var embeddingPayload EmbeddingPayload
	if err := json.Unmarshal(fake.tasks[0].Payload(), &embeddingPayload); err != nil {
		t.Fatalf("unmarshal embedding payload: %v", err)
	}
	if embeddingPayload.ProfileID != 7 {
		t.Fatalf("unexpected embedding payload %+v", embeddingPayload)
	}

	var deletionPayload DeletionPayload
	if err := json.Unmarshal(fake.tasks[1].Payload(), &deletionPayload); err != nil {
		t.Fatalf("unmarshal deletion payload: %v", err)
	}
	if deletionPayload.ProfileID != 11 {
		t.Fatalf("unexpected deletion payload %+v", deletionPayload)
	}

	client.Close()
	if !fake.closed {
		t.Fatal("expected client close")
	}
}

func TestNewQueueClient(t *testing.T) {
	old := newAsynqClient
	defer func() { newAsynqClient = old }()

	fake := &fakeEnqueuer{}
	newAsynqClient = func(opt asynq.RedisConnOpt) asynqEnqueuer {
		return fake
	}

	client := NewQueueClient("redis://localhost:6379/0", zap.NewNop())
	if client == nil {
		t.Fatal("expected queue client")
	}
	if client.client != fake {
		t.Fatal("expected injected asynq client")
	}
}

// --- Handler tests (dispatch only) ---

func TestTaskHandlerEmbeddingTask(t *testing.T) {
	runner := &fakeEmbeddingRunner{}
	handler := &TaskHandler{svc: runner, logger: zap.NewNop()}

	payload, _ := json.Marshal(EmbeddingPayload{ProfileID: 7})
	if err := handler.HandleEmbeddingTask(context.Background(), asynq.NewTask(TypeEmbeddingTask, payload)); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(runner.embedded) != 1 || runner.embedded[0] != 7 {
		t.Fatalf("expected EmbedProfile(7), got %v", runner.embedded)
	}
}

func TestTaskHandlerEmbeddingTaskErrors(t *testing.T) {
	t.Run("invalid payload skips retry", func(t *testing.T) {
		handler := &TaskHandler{svc: &fakeEmbeddingRunner{}, logger: zap.NewNop()}
		err := handler.HandleEmbeddingTask(context.Background(), asynq.NewTask(TypeEmbeddingTask, []byte("bad")))
		if !errors.Is(err, asynq.SkipRetry) {
			t.Fatalf("expected SkipRetry, got %v", err)
		}
	})

	t.Run("ErrNotFound skips retry", func(t *testing.T) {
		handler := &TaskHandler{svc: &fakeEmbeddingRunner{embedErr: services.ErrNotFound}, logger: zap.NewNop()}
		payload, _ := json.Marshal(EmbeddingPayload{ProfileID: 1})
		err := handler.HandleEmbeddingTask(context.Background(), asynq.NewTask(TypeEmbeddingTask, payload))
		if !errors.Is(err, asynq.SkipRetry) {
			t.Fatalf("expected SkipRetry on ErrNotFound, got %v", err)
		}
	})

	t.Run("other error propagated", func(t *testing.T) {
		handler := &TaskHandler{svc: &fakeEmbeddingRunner{embedErr: errors.New("transient failure")}, logger: zap.NewNop()}
		payload, _ := json.Marshal(EmbeddingPayload{ProfileID: 1})
		if err := handler.HandleEmbeddingTask(context.Background(), asynq.NewTask(TypeEmbeddingTask, payload)); err == nil {
			t.Fatal("expected error to propagate")
		}
	})
}

func TestTaskHandlerDeletionTask(t *testing.T) {
	runner := &fakeEmbeddingRunner{}
	handler := &TaskHandler{svc: runner, logger: zap.NewNop()}

	payload, _ := json.Marshal(DeletionPayload{ProfileID: 22})
	if err := handler.HandleDeletionTask(context.Background(), asynq.NewTask(TypeDeletionTask, payload)); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(runner.deleted) != 1 || runner.deleted[0] != 22 {
		t.Fatalf("expected DeleteEmbedding(22), got %v", runner.deleted)
	}
}

func TestTaskHandlerDeletionTaskErrors(t *testing.T) {
	t.Run("invalid payload skips retry", func(t *testing.T) {
		handler := &TaskHandler{svc: &fakeEmbeddingRunner{}, logger: zap.NewNop()}
		err := handler.HandleDeletionTask(context.Background(), asynq.NewTask(TypeDeletionTask, []byte("bad")))
		if !errors.Is(err, asynq.SkipRetry) {
			t.Fatalf("expected SkipRetry, got %v", err)
		}
	})

	t.Run("deletion error propagated", func(t *testing.T) {
		handler := &TaskHandler{svc: &fakeEmbeddingRunner{deleteErr: errors.New("delete failed")}, logger: zap.NewNop()}
		payload, _ := json.Marshal(DeletionPayload{ProfileID: 4})
		if err := handler.HandleDeletionTask(context.Background(), asynq.NewTask(TypeDeletionTask, payload)); err == nil {
			t.Fatal("expected error to propagate")
		}
	})
}
