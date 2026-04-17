package integration_test

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"nexia-backend/internal/repositories"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestCrossUserIsolation(t *testing.T) {
	kit := buildRouter(t, true)

	tokenA, _, _ := signupAndGetToken(t, kit, "user-a@example.com")
	tokenB, _, _ := signupAndGetToken(t, kit, "user-b@example.com")

	payload := newProfilePayload()
	payload["full_name"] = "A's Secret Friend"
	resp := postJSON(t, kit, "/api/v1/profiles", payload, tokenA)
	requireStatus(t, resp, http.StatusCreated)
	aProfileID := jsonID(t, decodeJSONMap(t, resp))

	t.Run("user B cannot GET user A's profile", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodGet, fmt.Sprintf("/api/v1/profiles/%d", aProfileID), nil, tokenB)
		requireStatus(t, w, http.StatusNotFound)
	})

	t.Run("user B cannot UPDATE user A's profile", func(t *testing.T) {
		update := newProfilePayload()
		update["full_name"] = "B overwrote this"
		w := doRequest(t, kit, http.MethodPut, fmt.Sprintf("/api/v1/profiles/%d", aProfileID), mustJSON(t, update), tokenB)
		requireStatus(t, w, http.StatusNotFound)

		w = doRequest(t, kit, http.MethodGet, fmt.Sprintf("/api/v1/profiles/%d", aProfileID), nil, tokenA)
		requireStatus(t, w, http.StatusOK)
		require.Equal(t, "A's Secret Friend", decodeJSONMap(t, w)["full_name"])
	})

	t.Run("user B cannot DELETE user A's profile", func(t *testing.T) {
		_ = doRequest(t, kit, http.MethodDelete, fmt.Sprintf("/api/v1/profiles/%d", aProfileID), nil, tokenB)

		getResp := doRequest(t, kit, http.MethodGet, fmt.Sprintf("/api/v1/profiles/%d", aProfileID), nil, tokenA)
		requireStatus(t, getResp, http.StatusOK)
	})

	t.Run("user B's list does not include user A's profiles", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodGet, "/api/v1/profiles?page=1&limit=100", nil, tokenB)
		requireStatus(t, w, http.StatusOK)
		require.Equal(t, float64(0), decodeJSONMap(t, w)["total"])
	})

	t.Run("user B's search does not leak user A's profile", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodGet, "/api/v1/profiles?search=Secret", nil, tokenB)
		require.Equal(t, float64(0), decodeJSONMap(t, w)["total"])
	})

	t.Run("vector search is user-scoped", func(t *testing.T) {
		repo := repositories.NewEmbeddingRepository(kit.db, zap.NewNop())
		profile, err := kit.users.FindByEmail("user-a@example.com")
		require.NoError(t, err)

		profileObj, err := repositories.NewProfileRepository(kit.db).FindByID(aProfileID, profile.ID)
		require.NoError(t, err)

		embedding := make([]float32, repositories.VectorSize)
		for i := range embedding {
			embedding[i] = 0.02
		}
		require.NoError(t, repo.UpsertProfile(context.Background(), profileObj, embedding))

		userB, err := kit.users.FindByEmail("user-b@example.com")
		require.NoError(t, err)

		results, err := repo.SearchContext(context.Background(), userB.ID, embedding, 5)
		require.NoError(t, err)
		require.Empty(t, results)

		results, err = repo.SearchContext(context.Background(), profile.ID, embedding, 5)
		require.NoError(t, err)
		require.Len(t, results, 1)
	})
}

func TestCrossUserChatIsolation(t *testing.T) {
	kit := buildRouter(t, true)

	tokenA, _, _ := signupAndGetToken(t, kit, "chat-a@example.com")
	tokenB, _, _ := signupAndGetToken(t, kit, "chat-b@example.com")

	aPayload := newProfilePayload()
	aPayload["full_name"] = "Alice-in-A"
	requireStatus(t, postJSON(t, kit, "/api/v1/profiles", aPayload, tokenA), http.StatusCreated)

	bPayload := newProfilePayload()
	bPayload["full_name"] = "Bob-in-B"
	requireStatus(t, postJSON(t, kit, "/api/v1/profiles", bPayload, tokenB), http.StatusCreated)

	for name, tok := range map[string]string{"A": tokenA, "B": tokenB} {
		w := postJSON(t, kit, "/api/v1/chat", map[string]any{"message": "who do I know?"}, tok)
		require.Equal(t, http.StatusOK, w.Code, "user %s", name)
	}
}

func TestAuthTokenFromDifferentSecretIsRejected(t *testing.T) {
	kit := buildRouter(t, false)
	signupAndGetToken(t, kit, "sec-a@example.com")

	bogusToken := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo5OTk5LCJleHAiOjk5OTk5OTk5OTl9.bogussignature"

	w := doRequest(t, kit, http.MethodGet, "/api/v1/profiles", nil, bogusToken)
	requireStatus(t, w, http.StatusUnauthorized)
}
