package integration_test

import (
	"context"
	"testing"

	"nexia-backend/internal/models"
	"nexia-backend/internal/repositories"

	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

func TestEmbeddingRepositoryIntegration(t *testing.T) {
	db := buildDB(t)
	repo := repositories.NewEmbeddingRepository(db, zap.NewNop())
	ctx := context.Background()

	userRepo := repositories.NewUserRepository(db)
	require.NoError(t, userRepo.Create(&models.User{Email: "embed-test@example.com", Password: "hashed"}))
	user, err := userRepo.FindByEmail("embed-test@example.com")
	require.NoError(t, err)

	profileRepo := repositories.NewProfileRepository(db)
	profile := &models.Profile{UserID: user.ID, FullName: "Embed Tester", RelationshipType: "Friend"}
	require.NoError(t, profileRepo.Create(profile))

	embedding := make([]float32, repositories.VectorSize)
	for i := range embedding {
		embedding[i] = 0.01
	}

	t.Run("upsert inserts a new embedding row", func(t *testing.T) {
		require.NoError(t, repo.UpsertProfile(ctx, profile, embedding))
	})

	t.Run("upsert again updates the existing row", func(t *testing.T) {
		require.NoError(t, repo.UpsertProfile(ctx, profile, embedding))
	})

	t.Run("search returns the upserted profile", func(t *testing.T) {
		results, err := repo.SearchContext(ctx, user.ID, embedding, 5)
		require.NoError(t, err)
		require.Len(t, results, 1)
		require.Equal(t, profile.ID, results[0].ProfileID)
	})

	t.Run("search filters by user_id", func(t *testing.T) {
		results, err := repo.SearchContext(ctx, 999, embedding, 5)
		require.NoError(t, err)
		require.Empty(t, results)
	})

	t.Run("delete removes the embedding row", func(t *testing.T) {
		require.NoError(t, repo.DeleteProfile(ctx, profile.ID))

		results, err := repo.SearchContext(ctx, user.ID, embedding, 5)
		require.NoError(t, err)
		require.Empty(t, results)
	})

	t.Run("delete non-existent profile is a no-op", func(t *testing.T) {
		require.NoError(t, repo.DeleteProfile(ctx, 9999))
	})
}
