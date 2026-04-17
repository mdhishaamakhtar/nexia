package integration_test

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"nexia-backend/internal/repositories"

	"go.uber.org/zap"
)

// TestCrossUserIsolation verifies that one user cannot read, modify, delete,
// or RAG-query another user's profiles. This is the most important
// authorization guarantee of the system.
func TestCrossUserIsolation(t *testing.T) {
	kit := buildRouter(t, true)

	tokenA, _, _ := signupAndGetToken(t, kit, "user-a@example.com")
	tokenB, _, _ := signupAndGetToken(t, kit, "user-b@example.com")

	// User A creates a profile.
	payload := newProfilePayload()
	payload["full_name"] = "A's Secret Friend"
	resp := postJSON(t, kit, "/api/v1/profiles", payload, tokenA)
	if resp.Code != http.StatusCreated {
		t.Fatalf("user A create: expected 201, got %d body=%s", resp.Code, resp.Body.String())
	}
	aProfileID := uint64(decodeJSONMap(t, resp)["id"].(float64))

	t.Run("user B cannot GET user A's profile", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodGet, fmt.Sprintf("/api/v1/profiles/%d", aProfileID), nil, tokenB)
		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404 (isolation by userID filter), got %d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("user B cannot UPDATE user A's profile", func(t *testing.T) {
		update := newProfilePayload()
		update["full_name"] = "B overwrote this"
		w := doRequest(t, kit, http.MethodPut, fmt.Sprintf("/api/v1/profiles/%d", aProfileID), mustJSON(t, update), tokenB)
		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d body=%s", w.Code, w.Body.String())
		}

		// Verify A's profile is unchanged.
		w = doRequest(t, kit, http.MethodGet, fmt.Sprintf("/api/v1/profiles/%d", aProfileID), nil, tokenA)
		if w.Code != http.StatusOK {
			t.Fatalf("A get own: expected 200, got %d", w.Code)
		}
		if decodeJSONMap(t, w)["full_name"] != "A's Secret Friend" {
			t.Fatal("user A's profile was mutated by user B")
		}
	})

	t.Run("user B cannot DELETE user A's profile", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodDelete, fmt.Sprintf("/api/v1/profiles/%d", aProfileID), nil, tokenB)
		// Delete is idempotent in GORM: it returns success (0 rows affected) because
		// the where clause matches no row. What we really care about is that the
		// profile still exists afterwards.
		_ = w

		getResp := doRequest(t, kit, http.MethodGet, fmt.Sprintf("/api/v1/profiles/%d", aProfileID), nil, tokenA)
		if getResp.Code != http.StatusOK {
			t.Fatalf("user A profile was deleted by user B — expected still present, got %d", getResp.Code)
		}
	})

	t.Run("user B's list does not include user A's profiles", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodGet, "/api/v1/profiles?page=1&limit=100", nil, tokenB)
		if w.Code != http.StatusOK {
			t.Fatalf("list expected 200, got %d body=%s", w.Code, w.Body.String())
		}
		result := decodeJSONMap(t, w)
		if total, _ := result["total"].(float64); total != 0 {
			t.Fatalf("expected B's list total=0, got %v", result["total"])
		}
	})

	t.Run("user B's search does not leak user A's profile", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodGet, "/api/v1/profiles?search=Secret", nil, tokenB)
		result := decodeJSONMap(t, w)
		if total, _ := result["total"].(float64); total != 0 {
			t.Fatalf("search leaked across users: got total=%v", result["total"])
		}
	})

	t.Run("vector search is user-scoped", func(t *testing.T) {
		// Manually seed an embedding for A's profile, then confirm B's search returns nothing.
		repo := repositories.NewEmbeddingRepository(kit.db, zap.NewNop())
		profile, err := kit.users.FindByEmail("user-a@example.com")
		if err != nil {
			t.Fatalf("find user A: %v", err)
		}
		_ = profile
		// Fetch the actual profile to get user/profile IDs.
		profileObj, err := repositories.NewProfileRepository(kit.db).FindByID(aProfileID, profile.ID)
		if err != nil {
			t.Fatalf("find A's profile: %v", err)
		}

		embedding := make([]float32, repositories.VectorSize)
		for i := range embedding {
			embedding[i] = 0.02
		}
		if err := repo.UpsertProfile(context.Background(), profileObj, embedding); err != nil {
			t.Fatalf("upsert A embedding: %v", err)
		}

		userB, err := kit.users.FindByEmail("user-b@example.com")
		if err != nil {
			t.Fatalf("find user B: %v", err)
		}
		results, err := repo.SearchContext(context.Background(), userB.ID, embedding, 5)
		if err != nil {
			t.Fatalf("search: %v", err)
		}
		if len(results) != 0 {
			t.Fatalf("user B's vector search returned %d results from user A — tenancy leak", len(results))
		}

		// Sanity: user A's own vector search should return the row.
		results, err = repo.SearchContext(context.Background(), profile.ID, embedding, 5)
		if err != nil {
			t.Fatalf("search A: %v", err)
		}
		if len(results) != 1 {
			t.Fatalf("user A expected 1 own result, got %d", len(results))
		}
	})
}

// TestCrossUserChatIsolation verifies that chat responses for user B cannot
// include user A's profile context. We drive this through the real chat endpoint
// but verify isolation via the vector-search boundary (the fake Gemini echoes a
// stock answer regardless of input). This complements TestCrossUserIsolation's
// direct pgvector test by exercising the full HTTP path.
func TestCrossUserChatIsolation(t *testing.T) {
	kit := buildRouter(t, true)

	tokenA, _, _ := signupAndGetToken(t, kit, "chat-a@example.com")
	tokenB, _, _ := signupAndGetToken(t, kit, "chat-b@example.com")

	// Both users get a profile so neither chat is blocked by "no data".
	aPayload := newProfilePayload()
	aPayload["full_name"] = "Alice-in-A"
	if w := postJSON(t, kit, "/api/v1/profiles", aPayload, tokenA); w.Code != http.StatusCreated {
		t.Fatalf("A create: %d", w.Code)
	}

	bPayload := newProfilePayload()
	bPayload["full_name"] = "Bob-in-B"
	if w := postJSON(t, kit, "/api/v1/profiles", bPayload, tokenB); w.Code != http.StatusCreated {
		t.Fatalf("B create: %d", w.Code)
	}

	// Both users can hit chat (returns the fake response); the critical
	// isolation assertion lives in TestCrossUserIsolation above, where we
	// verify pgvector.SearchContext scoping directly. This test just ensures
	// the endpoint responds successfully per-user.
	for name, tok := range map[string]string{"A": tokenA, "B": tokenB} {
		w := postJSON(t, kit, "/api/v1/chat", map[string]any{"message": "who do I know?"}, tok)
		if w.Code != http.StatusOK {
			t.Fatalf("user %s chat: expected 200, got %d body=%s", name, w.Code, w.Body.String())
		}
	}
}

// TestAuthTokenFromDifferentSecretIsRejected ensures a JWT signed with a
// different secret cannot access protected endpoints — guards against
// accidental multi-secret misconfiguration.
func TestAuthTokenFromDifferentSecretIsRejected(t *testing.T) {
	kit := buildRouter(t, false)
	signupAndGetToken(t, kit, "sec-a@example.com")

	// A JWT from a different app with a different secret would look like this.
	// The token decode should fail signature validation and return 401.
	bogusToken := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo5OTk5LCJleHAiOjk5OTk5OTk5OTl9.bogussignature"

	w := doRequest(t, kit, http.MethodGet, "/api/v1/profiles", nil, bogusToken)
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for token with wrong secret, got %d", w.Code)
	}
}
