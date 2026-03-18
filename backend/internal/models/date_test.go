package models_test

import (
	"strings"
	"testing"
	"time"

	"nexia-backend/internal/models"
)

func TestDateJSONAndDBHelpers(t *testing.T) {
	var d models.Date
	if err := d.UnmarshalJSON([]byte(`"2024-02-14"`)); err != nil {
		t.Fatalf("unmarshal valid date: %v", err)
	}

	b, err := d.MarshalJSON()
	if err != nil {
		t.Fatalf("marshal date: %v", err)
	}
	if string(b) != `"2024-02-14"` {
		t.Fatalf("unexpected json: %s", string(b))
	}

	if err := d.UnmarshalJSON([]byte(`"bad-date"`)); err == nil {
		t.Fatal("expected parse error")
	}

	if err := d.UnmarshalJSON([]byte(`null`)); err != nil {
		t.Fatalf("null should not fail: %v", err)
	}

	val, err := d.Value()
	if err != nil {
		t.Fatalf("value failed: %v", err)
	}
	if _, ok := val.(time.Time); !ok {
		t.Fatalf("expected time.Time value, got %T", val)
	}

	if err := d.Scan(time.Date(2024, time.May, 1, 0, 0, 0, 0, time.UTC)); err != nil {
		t.Fatalf("scan time failed: %v", err)
	}
	if err := d.Scan("not-time"); err == nil || !strings.Contains(err.Error(), "failed to scan Date value") {
		t.Fatalf("expected scan error, got %v", err)
	}
}
