package integration_test

import (
	"fmt"
	"net/http"
	"testing"
)

func TestProfileCRUDFlowIntegration(t *testing.T) {
	r := buildRouter(t, true)
	token, authCookie := signupAndGetToken(t, r, "profile-user@example.com")

	t.Run("protected endpoint rejects without auth", func(t *testing.T) {
		resp := doRequest(t, r, http.MethodGet, "/api/v1/profiles", nil, "")
		if resp.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401 got %d", resp.Code)
		}
	})

	createPayload := newProfilePayload()
	resp := postJSON(t, r, "/api/v1/profiles", createPayload, token)
	if resp.Code != http.StatusCreated {
		t.Fatalf("create profile expected 201 got %d body=%s", resp.Code, resp.Body.String())
	}
	created := decodeJSONMap(t, resp)
	idFloat, ok := created["id"].(float64)
	if !ok {
		t.Fatalf("expected id in create response")
	}
	profileID := uint64(idFloat)

	t.Run("list profiles using cookie auth", func(t *testing.T) {
		w := doRequest(t, r, http.MethodGet, "/api/v1/profiles?page=1&limit=10&search=alice", nil, "", authCookie)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
		}
		result := decodeJSONMap(t, w)
		if result["total"].(float64) != 1 {
			t.Fatalf("expected total 1 got %v", result["total"])
		}
	})

	t.Run("get profile", func(t *testing.T) {
		w := doRequest(t, r, http.MethodGet, fmt.Sprintf("/api/v1/profiles/%d", profileID), nil, token)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
		}
		result := decodeJSONMap(t, w)
		if result["full_name"] != "Alice Example" {
			t.Fatalf("unexpected full_name: %v", result["full_name"])
		}
	})

	t.Run("invalid id format returns bad request", func(t *testing.T) {
		w := doRequest(t, r, http.MethodGet, "/api/v1/profiles/not-a-number", nil, token)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("update profile", func(t *testing.T) {
		updatePayload := newProfilePayload()
		updatePayload["full_name"] = "Alice Updated"
		updatePayload["top_songs"] = []map[string]string{{"name": "New Song", "artist": "New Artist"}}
		w := doRequest(t, r, http.MethodPut, fmt.Sprintf("/api/v1/profiles/%d", profileID), mustJSON(t, updatePayload), token)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("validation path for top songs", func(t *testing.T) {
		badPayload := newProfilePayload()
		badPayload["top_songs"] = []map[string]string{
			{"name": "1", "artist": "a"},
			{"name": "2", "artist": "b"},
			{"name": "3", "artist": "c"},
			{"name": "4", "artist": "d"},
		}
		w := postJSON(t, r, "/api/v1/profiles", badPayload, token)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 got %d body=%s", w.Code, w.Body.String())
		}
		result := decodeJSONMap(t, w)
		errObj := result["error"].(map[string]any)
		if errObj["code"] != "VALIDATION_ERROR" {
			t.Fatalf("expected VALIDATION_ERROR got %v", errObj["code"])
		}
	})

	t.Run("update replaces associations not appends", func(t *testing.T) {
		// First update: set 2 tags
		p1 := newProfilePayload()
		p1["tags"] = []map[string]string{{"tag": "original-a"}, {"tag": "original-b"}}
		w := doRequest(t, r, http.MethodPut, fmt.Sprintf("/api/v1/profiles/%d", profileID), mustJSON(t, p1), token)
		if w.Code != http.StatusOK {
			t.Fatalf("first update: expected 200 got %d body=%s", w.Code, w.Body.String())
		}

		// Second update: replace with 1 different tag — must NOT accumulate the previous 2
		p2 := newProfilePayload()
		p2["tags"] = []map[string]string{{"tag": "replaced"}}
		w = doRequest(t, r, http.MethodPut, fmt.Sprintf("/api/v1/profiles/%d", profileID), mustJSON(t, p2), token)
		if w.Code != http.StatusOK {
			t.Fatalf("second update: expected 200 got %d body=%s", w.Code, w.Body.String())
		}

		// GET and verify exactly 1 tag with the new value
		getResp := doRequest(t, r, http.MethodGet, fmt.Sprintf("/api/v1/profiles/%d", profileID), nil, token)
		if getResp.Code != http.StatusOK {
			t.Fatalf("get after update: expected 200 got %d", getResp.Code)
		}
		body := decodeJSONMap(t, getResp)
		tags, ok := body["tags"].([]any)
		if !ok {
			t.Fatalf("expected tags array, got %T", body["tags"])
		}
		if len(tags) != 1 {
			t.Fatalf("expected exactly 1 tag after update (got %d) — duplicate associations bug!", len(tags))
		}
		if tags[0].(map[string]any)["tag"] != "replaced" {
			t.Fatalf("expected tag value 'replaced', got %v", tags[0].(map[string]any)["tag"])
		}
	})

	t.Run("delete profile", func(t *testing.T) {
		w := doRequest(t, r, http.MethodDelete, fmt.Sprintf("/api/v1/profiles/%d", profileID), nil, token)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
		}

		w = doRequest(t, r, http.MethodGet, fmt.Sprintf("/api/v1/profiles/%d", profileID), nil, token)
		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404 after delete got %d body=%s", w.Code, w.Body.String())
		}
	})

	t.Run("update missing record returns not found", func(t *testing.T) {
		w := doRequest(t, r, http.MethodPut, "/api/v1/profiles/999", mustJSON(t, newProfilePayload()), token)
		if w.Code != http.StatusNotFound {
			t.Fatalf("expected 404 got %d body=%s", w.Code, w.Body.String())
		}
	})
}

func newProfilePayload() map[string]any {
	return map[string]any{
		"full_name":         "Alice Example",
		"relationship_type": "Friend",
		"bio":               "A close friend",
		"profession":        "Engineer",
		"birthday":          "2000-03-21",
		"favorite_movie":    "Inception",
		"favorite_book":     "Dune",
		"favorite_memory":   "Road trip",
		"music_preference":  "Rock",
		"long_term_goals":   "Build startup",
		"tags":              []map[string]string{{"tag": "travel"}, {"tag": "music"}},
		"top_songs":         []map[string]string{{"name": "Song 1", "artist": "Artist 1"}},
		"quotes":            []map[string]string{{"quote": "Keep going"}},
		"movie_genres":      []map[string]string{{"genre": "Sci-Fi"}},
		"book_genres":       []map[string]string{{"genre": "Fantasy"}},
		"hangout_places":    []map[string]string{{"place": "Cafe"}},
		"food_restrictions": []map[string]string{{"restriction": "None"}},
		"political_views":   []map[string]string{{"view": "Moderate"}},
		"associated_song":   map[string]string{"name": "Song A", "artist": "Artist A"},
	}
}
