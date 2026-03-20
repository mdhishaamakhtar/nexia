package integration_test

import (
	"context"
	"testing"

	"nexia-backend/internal/models"
	"nexia-backend/internal/repositories"

	"go.uber.org/zap"
)

// TestEmbeddingRepositoryIntegration tests EmbeddingRepository directly against a real
// pgvector database rather than through the HTTP API.
//
// Why not through the API? UpsertProfile and DeleteProfile are called by the Asynq
// queue worker (EmbeddingService), not by the profile controller. When a profile is
// created or deleted via the API, ProfileService only enqueues a task in Redis — the
// actual pgvector writes happen asynchronously in a separate goroutine. The integration
// test setup (buildRouter) does not start an Asynq server, so those tasks are never
// processed and the repository methods are never reached through the HTTP path.
//
// Testing the repository directly here is the right boundary: the queue is a system
// boundary, and the profile CRUD tests already cover everything up to the enqueue.
func TestEmbeddingRepositoryIntegration(t *testing.T) {
	db := buildDB(t)
	repo := repositories.NewEmbeddingRepository(db, zap.NewNop())
	ctx := context.Background()

	// Seed a user and profile — profile_embeddings has a FK to profiles.id.
	userRepo := repositories.NewUserRepository(db)
	if err := userRepo.Create(&models.User{Email: "embed-test@example.com", Password: "hashed"}); err != nil {
		t.Fatalf("create user: %v", err)
	}
	user, err := userRepo.FindByEmail("embed-test@example.com")
	if err != nil {
		t.Fatalf("find user: %v", err)
	}

	profileRepo := repositories.NewProfileRepository(db)
	profile := &models.Profile{UserID: user.ID, FullName: "Embed Tester", RelationshipType: "Friend"}
	if err := profileRepo.Create(profile); err != nil {
		t.Fatalf("create profile: %v", err)
	}

	embedding := make([]float32, repositories.VectorSize)
	for i := range embedding {
		embedding[i] = 0.01
	}

	t.Run("upsert inserts a new embedding row", func(t *testing.T) {
		if err := repo.UpsertProfile(ctx, profile, embedding); err != nil {
			t.Fatalf("UpsertProfile: %v", err)
		}
	})

	t.Run("upsert again updates the existing row", func(t *testing.T) {
		if err := repo.UpsertProfile(ctx, profile, embedding); err != nil {
			t.Fatalf("UpsertProfile (update): %v", err)
		}
	})

	t.Run("search returns the upserted profile", func(t *testing.T) {
		results, err := repo.SearchContext(ctx, user.ID, embedding, 5)
		if err != nil {
			t.Fatalf("SearchContext: %v", err)
		}
		if len(results) != 1 {
			t.Fatalf("expected 1 result, got %d", len(results))
		}
		if results[0].ProfileID != profile.ID {
			t.Fatalf("expected profile_id %d, got %d", profile.ID, results[0].ProfileID)
		}
	})

	t.Run("search filters by user_id", func(t *testing.T) {
		results, err := repo.SearchContext(ctx, 999, embedding, 5)
		if err != nil {
			t.Fatalf("SearchContext: %v", err)
		}
		if len(results) != 0 {
			t.Fatalf("expected 0 results for unknown user, got %d", len(results))
		}
	})

	t.Run("delete removes the embedding row", func(t *testing.T) {
		if err := repo.DeleteProfile(ctx, profile.ID); err != nil {
			t.Fatalf("DeleteProfile: %v", err)
		}

		results, err := repo.SearchContext(ctx, user.ID, embedding, 5)
		if err != nil {
			t.Fatalf("SearchContext after delete: %v", err)
		}
		if len(results) != 0 {
			t.Fatalf("expected 0 results after delete, got %d", len(results))
		}
	})

	t.Run("delete non-existent profile is a no-op", func(t *testing.T) {
		if err := repo.DeleteProfile(ctx, 9999); err != nil {
			t.Fatalf("DeleteProfile non-existent: %v", err)
		}
	})
}
