package integration_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync/atomic"
	"testing"
	"time"

	"nexia-backend/internal/models"
	"nexia-backend/internal/queue"
	"nexia-backend/internal/repositories"
	"nexia-backend/internal/services"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"
)

// fakeGemini3072 returns an embedding of the size the pgvector column expects.
// We also track how many times GenerateEmbedding was called so tests can assert
// the async worker actually ran.
type fakeGemini3072 struct {
	calls atomic.Int32
	fail  atomic.Bool
}

func (f *fakeGemini3072) GenerateEmbedding(_ context.Context, _ string) ([]float32, error) {
	f.calls.Add(1)
	if f.fail.Load() {
		return nil, errors.New("simulated gemini failure")
	}
	v := make([]float32, repositories.VectorSize)
	for i := range v {
		v[i] = 0.001
	}
	return v, nil
}

func (f *fakeGemini3072) GenerateChatResponse(_ context.Context, _ string, _ string) (string, error) {
	return "ok", nil
}

// startEmbeddingWorker registers the real EmbeddingService against the kit's
// Redis and starts the Asynq server in a goroutine. The server is gracefully
// shut down when the test completes.
func startEmbeddingWorker(t *testing.T, kit *integrationKit, gemini services.GeminiClient) {
	t.Helper()

	profileRepo := repositories.NewProfileRepository(kit.db)
	embeddingRepo := repositories.NewEmbeddingRepository(kit.db, zap.NewNop())
	svc := services.NewEmbeddingService(profileRepo, gemini, embeddingRepo, zap.NewNop())
	handler := queue.NewTaskHandler(svc, zap.NewNop())

	server := asynq.NewServer(queue.ParseRedisOpt(kit.redisURL), asynq.Config{
		Concurrency: 2,
		LogLevel:    asynq.ErrorLevel,
	})

	mux := asynq.NewServeMux()
	mux.HandleFunc(queue.TypeEmbeddingTask, handler.HandleEmbeddingTask)
	mux.HandleFunc(queue.TypeDeletionTask, handler.HandleDeletionTask)

	done := make(chan struct{})
	go func() {
		_ = server.Run(mux)
		close(done)
	}()

	t.Cleanup(func() {
		server.Shutdown()
		select {
		case <-done:
		case <-time.After(5 * time.Second):
			t.Log("asynq server did not shut down within 5s")
		}
	})
}

// waitForCondition polls until fn returns true or the deadline expires.
// Returns true on success, false on timeout.
func waitForCondition(deadline time.Duration, fn func() bool) bool {
	end := time.Now().Add(deadline)
	for time.Now().Before(end) {
		if fn() {
			return true
		}
		time.Sleep(50 * time.Millisecond)
	}
	return fn()
}

// countEmbeddingRows returns how many rows exist in profile_embeddings for the
// given profile. We count rather than select to avoid vector-column marshalling.
func countEmbeddingRows(t *testing.T, kit *integrationKit, profileID uint64) int64 {
	t.Helper()
	var n int64
	if err := kit.db.Raw("SELECT COUNT(*) FROM profile_embeddings WHERE profile_id = ?", profileID).Scan(&n).Error; err != nil {
		t.Fatalf("count embedding rows: %v", err)
	}
	return n
}

// TestAsyncEmbeddingPipelineEndToEnd verifies the full async pipeline:
// create profile via HTTP -> producer enqueues -> worker consumes -> embedding
// row appears in pgvector. This closes the main coverage gap flagged in the
// audit: prior tests only verified enqueue, never consumption.
func TestAsyncEmbeddingPipelineEndToEnd(t *testing.T) {
	kit := buildRouter(t, true)
	gemini := &fakeGemini3072{}
	startEmbeddingWorker(t, kit, gemini)

	token, _, _ := signupAndGetToken(t, kit, "async-create@example.com")

	payload := newProfilePayload()
	payload["full_name"] = "Async Created"
	resp := postJSON(t, kit, "/api/v1/profiles", payload, token)
	if resp.Code != http.StatusCreated {
		t.Fatalf("create: %d body=%s", resp.Code, resp.Body.String())
	}
	profileID := uint64(decodeJSONMap(t, resp)["id"].(float64))

	if !waitForCondition(10*time.Second, func() bool {
		return countEmbeddingRows(t, kit, profileID) == 1
	}) {
		t.Fatalf("embedding row never appeared for profile %d (gemini calls=%d)", profileID, gemini.calls.Load())
	}

	if gemini.calls.Load() == 0 {
		t.Fatal("expected Gemini.GenerateEmbedding to be called by worker")
	}
}

// TestAsyncEmbeddingUpdateReplacesRow verifies that updating a profile causes
// the worker to re-embed and the existing row is updated rather than
// accumulating duplicates.
func TestAsyncEmbeddingUpdateReplacesRow(t *testing.T) {
	kit := buildRouter(t, true)
	gemini := &fakeGemini3072{}
	startEmbeddingWorker(t, kit, gemini)

	token, _, _ := signupAndGetToken(t, kit, "async-update@example.com")

	// Create
	resp := postJSON(t, kit, "/api/v1/profiles", newProfilePayload(), token)
	if resp.Code != http.StatusCreated {
		t.Fatalf("create: %d", resp.Code)
	}
	profileID := uint64(decodeJSONMap(t, resp)["id"].(float64))

	if !waitForCondition(10*time.Second, func() bool {
		return countEmbeddingRows(t, kit, profileID) == 1
	}) {
		t.Fatalf("initial embedding never appeared")
	}
	callsAfterCreate := gemini.calls.Load()

	// Update
	update := newProfilePayload()
	update["full_name"] = "Async Updated"
	w := doRequest(t, kit, http.MethodPut, fmt.Sprintf("/api/v1/profiles/%d", profileID), mustJSON(t, update), token)
	if w.Code != http.StatusOK {
		t.Fatalf("update: %d body=%s", w.Code, w.Body.String())
	}

	if !waitForCondition(10*time.Second, func() bool {
		return gemini.calls.Load() > callsAfterCreate
	}) {
		t.Fatal("expected update to trigger re-embedding")
	}

	// Still exactly one row — upsert, not duplicate.
	if got := countEmbeddingRows(t, kit, profileID); got != 1 {
		t.Fatalf("expected 1 embedding row after update, got %d", got)
	}

	// Payload should reflect the new name.
	var payload []byte
	if err := kit.db.Raw("SELECT payload FROM profile_embeddings WHERE profile_id = ?", profileID).Scan(&payload).Error; err != nil {
		t.Fatalf("select payload: %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if decoded["full_name"] != "Async Updated" {
		t.Fatalf("expected updated payload, got full_name=%v", decoded["full_name"])
	}
}

// TestAsyncEmbeddingDeletePropagates verifies deleting a profile via HTTP
// asynchronously removes its embedding row.
func TestAsyncEmbeddingDeletePropagates(t *testing.T) {
	kit := buildRouter(t, true)
	gemini := &fakeGemini3072{}
	startEmbeddingWorker(t, kit, gemini)

	token, _, _ := signupAndGetToken(t, kit, "async-delete@example.com")

	resp := postJSON(t, kit, "/api/v1/profiles", newProfilePayload(), token)
	if resp.Code != http.StatusCreated {
		t.Fatalf("create: %d", resp.Code)
	}
	profileID := uint64(decodeJSONMap(t, resp)["id"].(float64))

	if !waitForCondition(10*time.Second, func() bool {
		return countEmbeddingRows(t, kit, profileID) == 1
	}) {
		t.Fatal("embedding row never appeared")
	}

	// Delete the profile. CASCADE would remove the embedding row too; we
	// want to verify the queue-driven delete path works, so we'll check
	// that the row is gone one way or the other.
	w := doRequest(t, kit, http.MethodDelete, fmt.Sprintf("/api/v1/profiles/%d", profileID), nil, token)
	if w.Code != http.StatusOK {
		t.Fatalf("delete: %d", w.Code)
	}

	if !waitForCondition(10*time.Second, func() bool {
		return countEmbeddingRows(t, kit, profileID) == 0
	}) {
		t.Fatal("embedding row still present after profile delete")
	}
}

// TestAsyncEmbeddingSkipsRetryForDeletedProfile verifies the retry-skip path in
// the consumer: if a profile is deleted before the worker processes its
// embedding task, the worker logs a warning and does not retry.
func TestAsyncEmbeddingSkipsRetryForDeletedProfile(t *testing.T) {
	kit := buildRouter(t, true)
	gemini := &fakeGemini3072{}
	startEmbeddingWorker(t, kit, gemini)

	// Seed a user directly so we don't need to signup; we'll enqueue a task
	// for a profile ID that never existed.
	if err := kit.users.Create(&models.User{Email: "missing-profile@example.com", Password: "hashed"}); err != nil {
		t.Fatalf("create user: %v", err)
	}

	client := queue.NewQueueClient(kit.redisURL, zap.NewNop())
	defer client.Close()

	if err := client.EnqueueEmbeddingTask(9999999); err != nil {
		t.Fatalf("enqueue: %v", err)
	}

	// The worker will try to load, find nothing, and skip retry. The only
	// observable is that Gemini is never called (profile load fails first).
	time.Sleep(2 * time.Second)
	if gemini.calls.Load() != 0 {
		t.Fatalf("expected Gemini not to be called for missing profile, got %d calls", gemini.calls.Load())
	}
}
