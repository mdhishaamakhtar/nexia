package integration_test

import (
	"net/http"
	"testing"
)

func TestHealthAndReadinessEndpoints(t *testing.T) {
	kit := buildRouter(t, true)

	for _, path := range []string{"/api/v1/healthz", "/api/v1/readyz"} {
		w := doRequest(t, kit, http.MethodGet, path, nil, "")
		if w.Code != http.StatusOK {
			t.Fatalf("%s expected 200 got %d", path, w.Code)
		}
		out := decodeJSONMap(t, w)
		if out["status"] == "" {
			t.Fatalf("%s missing status", path)
		}
	}
}
