package integration_test

import (
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestHealthAndReadinessEndpoints(t *testing.T) {
	kit := buildRouter(t, true)

	for _, path := range []string{"/api/v1/healthz", "/api/v1/readyz"} {
		w := doRequest(t, kit, http.MethodGet, path, nil, "")
		requireStatus(t, w, http.StatusOK)
		require.NotEmpty(t, decodeJSONMap(t, w)["status"])
	}
}

func TestSwaggerEndpointIntegration(t *testing.T) {
	kit := buildRouter(t, true)
	w := doRequest(t, kit, http.MethodGet, "/api/v1/swagger/index.html", nil, "")
	requireStatus(t, w, http.StatusOK)
}

func TestReadinessReturnsUnavailableWhenDBClosed(t *testing.T) {
	kit := buildRouter(t, true)
	sqlDB, err := kit.db.DB()
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	w := doRequest(t, kit, http.MethodGet, "/api/v1/readyz", nil, "")
	requireStatus(t, w, http.StatusServiceUnavailable)
}
