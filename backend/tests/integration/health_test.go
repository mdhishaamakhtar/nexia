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

func TestSwaggerEndpointIntegration(t *testing.T) {
	kit := buildRouter(t, true)

	w := doRequest(t, kit, http.MethodGet, "/api/v1/swagger/index.html", nil, "")
	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 got %d body=%s", w.Code, w.Body.String())
	}
}

func TestReadinessReturnsUnavailableWhenDBClosed(t *testing.T) {
	kit := buildRouter(t, true)
	sqlDB, err := kit.db.DB()
	if err != nil {
		t.Fatalf("get sql db: %v", err)
	}
	if err := sqlDB.Close(); err != nil {
		t.Fatalf("close sql db: %v", err)
	}

	w := doRequest(t, kit, http.MethodGet, "/api/v1/readyz", nil, "")
	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 got %d body=%s", w.Code, w.Body.String())
	}
}
