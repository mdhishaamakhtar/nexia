package integration_test

import (
	"fmt"
	"net/http"
	"testing"
)

// TestProfileListPaginationAndFilters exercises the query parameters of
// GET /profiles: pagination bounds clamping, search, and relationship filter.
// It also confirms that search/filter arguments cannot leak into SQL (a
// simple injection payload must be treated as a literal substring).
func TestProfileListPaginationAndFilters(t *testing.T) {
	kit := buildRouter(t, true)
	token, _, _ := signupAndGetToken(t, kit, "list-user@example.com")

	// Seed 25 profiles with a mix of relationship types and names.
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
		if resp.Code != http.StatusCreated {
			t.Fatalf("seed create %d: %d body=%s", i, resp.Code, resp.Body.String())
		}
	}

	listTotal := func(t *testing.T, qs string) (int, int) {
		t.Helper()
		w := doRequest(t, kit, http.MethodGet, "/api/v1/profiles?"+qs, nil, token)
		if w.Code != http.StatusOK {
			t.Fatalf("list (%s): %d body=%s", qs, w.Code, w.Body.String())
		}
		result := decodeJSONMap(t, w)
		data, _ := result["data"].([]any)
		total, _ := result["total"].(float64)
		return len(data), int(total)
	}

	t.Run("default page size is 10", func(t *testing.T) {
		got, total := listTotal(t, "")
		if got != 10 || total != 25 {
			t.Fatalf("expected 10 items / 25 total, got %d / %d", got, total)
		}
	})

	t.Run("limit above max is clamped to 100", func(t *testing.T) {
		// We only have 25 rows so we use total as ceiling. The service
		// clamps limit to 100 but the DB will just return the 25 existing.
		got, _ := listTotal(t, "limit=500")
		if got != 25 {
			t.Fatalf("expected all 25 rows when limit is clamped, got %d", got)
		}
	})

	t.Run("negative page is clamped to 1", func(t *testing.T) {
		got, _ := listTotal(t, "page=-5&limit=10")
		if got != 10 {
			t.Fatalf("expected first page with 10 items, got %d", got)
		}
	})

	t.Run("beyond last page returns empty data but correct total", func(t *testing.T) {
		got, total := listTotal(t, "page=99&limit=10")
		if got != 0 {
			t.Fatalf("expected 0 items on page 99, got %d", got)
		}
		if total != 25 {
			t.Fatalf("expected total still 25, got %d", total)
		}
	})

	t.Run("relationship_type filter", func(t *testing.T) {
		got, total := listTotal(t, "relationship_type=Family&limit=100")
		if got == 0 || got != total {
			t.Fatalf("expected filtered list, got len=%d total=%d", got, total)
		}
		// Roughly 9 of 25 are Family.
		if total < 5 || total > 15 {
			t.Fatalf("unexpected family count %d", total)
		}
	})

	t.Run("search is case-insensitive substring", func(t *testing.T) {
		_, totalUpper := listTotal(t, "search=FAMILY&limit=100")
		_, totalLower := listTotal(t, "search=family&limit=100")
		if totalUpper != totalLower || totalUpper == 0 {
			t.Fatalf("case sensitivity mismatch: upper=%d lower=%d", totalUpper, totalLower)
		}
	})

	t.Run("search rejects SQL injection as literal", func(t *testing.T) {
		// GORM parameterises the query; the ' OR 1=1 -- should be treated
		// as a literal substring and match nothing rather than returning all rows.
		_, total := listTotal(t, "search=%27+OR+1%3D1+--&limit=100")
		if total != 0 {
			t.Fatalf("search injection leaked: total=%d (expected 0)", total)
		}
	})

	t.Run("search combined with relationship filter", func(t *testing.T) {
		_, total := listTotal(t, "search=Family&relationship_type=Friend&limit=100")
		if total != 0 {
			t.Fatalf("search+filter should have no overlap, got %d", total)
		}
	})

	t.Run("non-numeric page/limit fall back to defaults", func(t *testing.T) {
		got, _ := listTotal(t, "page=abc&limit=xyz")
		if got != 10 {
			t.Fatalf("expected default limit=10 when params are non-numeric, got %d", got)
		}
	})
}
