package ai

import (
	"context"
	"errors"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"nexia-backend/internal/models"
)

func newMockGormDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	db, err := gorm.Open(postgres.New(postgres.Config{
		Conn:                 sqlDB,
		PreferSimpleProtocol: true,
	}), &gorm.Config{DisableAutomaticPing: true})
	if err != nil {
		t.Fatalf("gorm.Open: %v", err)
	}
	return db, mock
}

func TestPgVectorClientUpsertAndDelete(t *testing.T) {
	db, mock := newMockGormDB(t)
	client := NewPgVectorClient(db, zap.NewNop())
	profile := &models.Profile{ID: 7, UserID: 9, FullName: "Alice"}

	if got := (profileEmbeddingRow{}).TableName(); got != "profile_embeddings" {
		t.Fatalf("unexpected table name %q", got)
	}

	mock.ExpectExec("INSERT INTO profile_embeddings").
		WithArgs(profile.ID, profile.UserID, sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))

	if err := client.UpsertProfile(context.Background(), profile, []float32{0.1, 0.2}); err != nil {
		t.Fatalf("UpsertProfile returned error: %v", err)
	}

	mock.ExpectExec("DELETE FROM profile_embeddings WHERE profile_id = \\$1").
		WithArgs(uint64(7)).
		WillReturnResult(sqlmock.NewResult(1, 1))

	if err := client.DeleteProfile(context.Background(), 7); err != nil {
		t.Fatalf("DeleteProfile returned error: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestPgVectorClientUpsertAndSearchErrors(t *testing.T) {
	db, mock := newMockGormDB(t)
	client := NewPgVectorClient(db, zap.NewNop())

	mock.ExpectExec("INSERT INTO profile_embeddings").
		WillReturnError(errors.New("insert failed"))

	if err := client.UpsertProfile(context.Background(), &models.Profile{ID: 1, UserID: 2}, []float32{0.1}); err == nil {
		t.Fatal("expected upsert error")
	}

	mock.ExpectQuery("SELECT profile_id,").
		WithArgs(sqlmock.AnyArg(), uint64(2), sqlmock.AnyArg(), 2).
		WillReturnError(errors.New("query failed"))

	if _, err := client.SearchContext(context.Background(), 2, []float32{0.1}, 2); err == nil {
		t.Fatal("expected search error")
	}

	mock.ExpectExec("DELETE FROM profile_embeddings WHERE profile_id = \\$1").
		WithArgs(uint64(9)).
		WillReturnError(errors.New("delete failed"))
	if err := client.DeleteProfile(context.Background(), 9); err == nil {
		t.Fatal("expected delete error")
	}
}

func TestPgVectorClientSearchContextSkipsBadPayloads(t *testing.T) {
	db, mock := newMockGormDB(t)
	client := NewPgVectorClient(db, zap.NewNop())

	rows := sqlmock.NewRows([]string{"profile_id", "score", "payload"}).
		AddRow(1, 0.95, `{"full_name":"Alice"}`).
		AddRow(2, 0.70, `not-json`)

	mock.ExpectQuery("SELECT profile_id,").
		WithArgs(sqlmock.AnyArg(), uint64(5), sqlmock.AnyArg(), 2).
		WillReturnRows(rows)

	results, err := client.SearchContext(context.Background(), 5, []float32{0.1, 0.2}, 2)
	if err != nil {
		t.Fatalf("SearchContext returned error: %v", err)
	}
	if len(results) != 1 || results[0].ProfileID != 1 || results[0].Payload["full_name"] != "Alice" {
		t.Fatalf("unexpected search results %+v", results)
	}
}
