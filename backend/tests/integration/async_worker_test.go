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
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

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

	require.NoError(t, server.Start(mux))

	t.Cleanup(func() {
		server.Stop()
		server.Shutdown()
	})
}

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

func countEmbeddingRows(t *testing.T, kit *integrationKit, profileID uint64) int64 {
	t.Helper()
	var n int64
	require.NoError(t, kit.db.Raw("SELECT COUNT(*) FROM profile_embeddings WHERE profile_id = ?", profileID).Scan(&n).Error)
	return n
}

func TestAsyncEmbeddingPipelineEndToEnd(t *testing.T) {
	kit := buildRouter(t, true)
	gemini := &fakeGemini3072{}
	startEmbeddingWorker(t, kit, gemini)

	token, _, _ := signupAndGetToken(t, kit, "async-create@example.com")

	payload := newProfilePayload()
	payload["full_name"] = "Async Created"
	resp := postJSON(t, kit, "/api/v1/profiles", payload, token)
	requireStatus(t, resp, http.StatusCreated)
	profileID := jsonID(t, decodeJSONMap(t, resp))

	require.True(t, waitForCondition(10*time.Second, func() bool {
		return countEmbeddingRows(t, kit, profileID) == 1
	}))
	require.Positive(t, gemini.calls.Load())
}

func TestAsyncEmbeddingUpdateReplacesRow(t *testing.T) {
	kit := buildRouter(t, true)
	gemini := &fakeGemini3072{}
	startEmbeddingWorker(t, kit, gemini)

	token, _, _ := signupAndGetToken(t, kit, "async-update@example.com")

	resp := postJSON(t, kit, "/api/v1/profiles", newProfilePayload(), token)
	requireStatus(t, resp, http.StatusCreated)
	profileID := jsonID(t, decodeJSONMap(t, resp))

	require.True(t, waitForCondition(10*time.Second, func() bool {
		return countEmbeddingRows(t, kit, profileID) == 1
	}))
	callsAfterCreate := gemini.calls.Load()

	update := newProfilePayload()
	update["full_name"] = "Async Updated"
	w := doRequest(t, kit, http.MethodPut, fmt.Sprintf("/api/v1/profiles/%d", profileID), mustJSON(t, update), token)
	requireStatus(t, w, http.StatusOK)

	require.True(t, waitForCondition(10*time.Second, func() bool {
		return gemini.calls.Load() > callsAfterCreate
	}))
	require.EqualValues(t, 1, countEmbeddingRows(t, kit, profileID))

	var row struct {
		Payload []byte `gorm:"column:payload"`
	}
	require.NoError(t, kit.db.Raw("SELECT payload FROM profile_embeddings WHERE profile_id = ?", profileID).Scan(&row).Error)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(row.Payload, &decoded))
	require.Equal(t, "Async Updated", decoded["full_name"])
}

func TestAsyncEmbeddingDeletePropagates(t *testing.T) {
	kit := buildRouter(t, true)
	gemini := &fakeGemini3072{}
	startEmbeddingWorker(t, kit, gemini)

	token, _, _ := signupAndGetToken(t, kit, "async-delete@example.com")

	resp := postJSON(t, kit, "/api/v1/profiles", newProfilePayload(), token)
	requireStatus(t, resp, http.StatusCreated)
	profileID := jsonID(t, decodeJSONMap(t, resp))

	require.True(t, waitForCondition(10*time.Second, func() bool {
		return countEmbeddingRows(t, kit, profileID) == 1
	}))

	w := doRequest(t, kit, http.MethodDelete, fmt.Sprintf("/api/v1/profiles/%d", profileID), nil, token)
	requireStatus(t, w, http.StatusOK)

	require.True(t, waitForCondition(10*time.Second, func() bool {
		return countEmbeddingRows(t, kit, profileID) == 0
	}))
}

func TestAsyncEmbeddingSkipsRetryForDeletedProfile(t *testing.T) {
	kit := buildRouter(t, true)
	gemini := &fakeGemini3072{}
	startEmbeddingWorker(t, kit, gemini)

	require.NoError(t, kit.users.Create(&models.User{Email: "missing-profile@example.com", Password: "hashed"}))

	client := queue.NewQueueClient(kit.redisURL, zap.NewNop())
	defer client.Close()

	require.NoError(t, client.EnqueueEmbeddingTask(9999999))

	time.Sleep(2 * time.Second)
	require.Zero(t, gemini.calls.Load())
}
