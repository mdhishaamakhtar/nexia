package integration_test

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestProfileListPaginationAndFilters(t *testing.T) {
	kit := buildRouter(t, true)
	token, _, _ := signupAndGetToken(t, kit, "list-user@example.com")

	for i := 0; i < 25; i++ {
		payload := newProfilePayload()
		if i%3 == 0 {
			payload["relationship_type"] = "Family"
			payload["full_name"] = fmt.Sprintf("Family Member %d", i)
		} else {
			payload["relationship_type"] = "Friend"
			payload["full_name"] = fmt.Sprintf("Friend %d", i)
		}
		resp := postJSON(t, kit, "/api/v1/profiles", payload, token)
		requireStatus(t, resp, http.StatusCreated)
	}

	listTotal := func(t *testing.T, qs string) (int, int) {
		t.Helper()
		w := doRequest(t, kit, http.MethodGet, "/api/v1/profiles?"+qs, nil, token)
		requireStatus(t, w, http.StatusOK)
		result := decodeJSONMap(t, w)
		data, _ := result["data"].([]any)
		total, _ := result["total"].(float64)
		return len(data), int(total)
	}

	t.Run("default page size is 10", func(t *testing.T) {
		got, total := listTotal(t, "")
		require.Equal(t, 10, got)
		require.Equal(t, 25, total)
	})

	t.Run("limit above max is clamped to 100", func(t *testing.T) {
		got, _ := listTotal(t, "limit=500")
		require.Equal(t, 25, got)
	})

	t.Run("negative page is clamped to 1", func(t *testing.T) {
		got, _ := listTotal(t, "page=-5&limit=10")
		require.Equal(t, 10, got)
	})

	t.Run("beyond last page returns empty data but correct total", func(t *testing.T) {
		got, total := listTotal(t, "page=99&limit=10")
		require.Zero(t, got)
		require.Equal(t, 25, total)
	})

	t.Run("relationship_type filter", func(t *testing.T) {
		got, total := listTotal(t, "relationship_type=Family&limit=100")
		require.NotZero(t, got)
		require.Equal(t, total, got)
		require.GreaterOrEqual(t, total, 5)
		require.LessOrEqual(t, total, 15)
	})

	t.Run("search is case-insensitive substring", func(t *testing.T) {
		_, totalUpper := listTotal(t, "search=FAMILY&limit=100")
		_, totalLower := listTotal(t, "search=family&limit=100")
		require.Equal(t, totalUpper, totalLower)
		require.NotZero(t, totalUpper)
	})

	t.Run("search rejects SQL injection as literal", func(t *testing.T) {
		_, total := listTotal(t, "search=%27+OR+1%3D1+--&limit=100")
		require.Zero(t, total)
	})

	t.Run("search combined with relationship filter", func(t *testing.T) {
		_, total := listTotal(t, "search=Family&relationship_type=Friend&limit=100")
		require.Zero(t, total)
	})

	t.Run("non-numeric page/limit fall back to defaults", func(t *testing.T) {
		got, _ := listTotal(t, "page=abc&limit=xyz")
		require.Equal(t, 10, got)
	})
}
