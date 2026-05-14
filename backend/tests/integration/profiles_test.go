package integration_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestProfileCRUDFlowIntegration(t *testing.T) {
	kit := buildRouter(t, true)
	token, authCookie, csrfCookie := signupAndGetToken(t, kit, "profile-user@example.com")

	t.Run("protected endpoint rejects without auth", func(t *testing.T) {
		resp := doRequest(t, kit, http.MethodGet, "/api/v1/profiles", nil, "")
		requireStatus(t, resp, http.StatusUnauthorized)
	})

	createPayload := newProfilePayload()
	resp := postJSON(t, kit, "/api/v1/profiles", createPayload, token)
	requireStatus(t, resp, http.StatusCreated)
	profileID := jsonID(t, decodeJSONMap(t, resp))

	t.Run("list profiles using cookie auth", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodGet, "/api/v1/profiles?page=1&limit=10&search=alice", nil, "", authCookie, csrfCookie)
		requireStatus(t, w, http.StatusOK)
		require.Equal(t, float64(1), decodeJSONMap(t, w)["total"])
	})

	t.Run("get profile", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodGet, fmt.Sprintf("/api/v1/profiles/%d", profileID), nil, token)
		requireStatus(t, w, http.StatusOK)
		body := decodeJSONMap(t, w)
		require.Equal(t, "Alice Example", body["full_name"])
		require.Equal(t, "Met in college, very reliable", body["notes"])
	})

	t.Run("invalid id format returns bad request", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodGet, "/api/v1/profiles/not-a-number", nil, token)
		requireStatus(t, w, http.StatusBadRequest)
	})

	t.Run("update profile", func(t *testing.T) {
		updatePayload := newProfilePayload()
		updatePayload["full_name"] = "Alice Updated"
		updatePayload["top_songs"] = []map[string]string{{"name": "New Song", "artist": "New Artist"}}
		w := doRequest(t, kit, http.MethodPut, fmt.Sprintf("/api/v1/profiles/%d", profileID), mustJSON(t, updatePayload), token)
		requireStatus(t, w, http.StatusOK)
	})

	t.Run("validation path for top songs", func(t *testing.T) {
		badPayload := newProfilePayload()
		badPayload["top_songs"] = []map[string]string{
			{"name": "1", "artist": "a"},
			{"name": "2", "artist": "b"},
			{"name": "3", "artist": "c"},
			{"name": "4", "artist": "d"},
		}
		w := postJSON(t, kit, "/api/v1/profiles", badPayload, token)
		requireErrorCode(t, w, http.StatusBadRequest, "VALIDATION_ERROR")
	})

	t.Run("update replaces associations not appends", func(t *testing.T) {
		p1 := newProfilePayload()
		p1["tags"] = []map[string]string{{"tag": "original-a"}, {"tag": "original-b"}}
		w := doRequest(t, kit, http.MethodPut, fmt.Sprintf("/api/v1/profiles/%d", profileID), mustJSON(t, p1), token)
		requireStatus(t, w, http.StatusOK)

		p2 := newProfilePayload()
		p2["tags"] = []map[string]string{{"tag": "replaced"}}
		w = doRequest(t, kit, http.MethodPut, fmt.Sprintf("/api/v1/profiles/%d", profileID), mustJSON(t, p2), token)
		requireStatus(t, w, http.StatusOK)

		getResp := doRequest(t, kit, http.MethodGet, fmt.Sprintf("/api/v1/profiles/%d", profileID), nil, token)
		requireStatus(t, getResp, http.StatusOK)
		body := decodeJSONMap(t, getResp)
		tags, ok := body["tags"].([]any)
		require.True(t, ok)
		require.Len(t, tags, 1)
		require.Equal(t, "replaced", tags[0].(map[string]any)["tag"])
	})

	t.Run("delete profile", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodDelete, fmt.Sprintf("/api/v1/profiles/%d", profileID), nil, token)
		requireStatus(t, w, http.StatusOK)

		w = doRequest(t, kit, http.MethodGet, fmt.Sprintf("/api/v1/profiles/%d", profileID), nil, token)
		requireStatus(t, w, http.StatusNotFound)
	})

	t.Run("update missing record returns not found", func(t *testing.T) {
		w := doRequest(t, kit, http.MethodPut, "/api/v1/profiles/999", mustJSON(t, newProfilePayload()), token)
		requireStatus(t, w, http.StatusNotFound)
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
		"notes":             "Met in college, very reliable",
	}
}
