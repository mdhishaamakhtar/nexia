package models_test

import (
	"strings"
	"testing"
	"time"

	"nexia-backend/internal/models"

	"github.com/stretchr/testify/require"
)

func TestDateJSONAndDBHelpers(t *testing.T) {
	var d models.Date
	require.NoError(t, d.UnmarshalJSON([]byte(`"2024-02-14"`)))

	b, err := d.MarshalJSON()
	require.NoError(t, err)
	require.Equal(t, `"2024-02-14"`, string(b))

	require.Error(t, d.UnmarshalJSON([]byte(`"bad-date"`)))
	require.NoError(t, d.UnmarshalJSON([]byte(`null`)))

	val, err := d.Value()
	require.NoError(t, err)
	require.IsType(t, time.Time{}, val)

	require.NoError(t, d.Scan(time.Date(2024, time.May, 1, 0, 0, 0, 0, time.UTC)))

	err = d.Scan("not-time")
	require.Error(t, err)
	require.True(t, strings.Contains(err.Error(), "failed to scan Date value"))
}
