package repositories

import (
	"context"
	"encoding/json"
	"fmt"

	"nexia-backend/internal/models"

	"github.com/pgvector/pgvector-go"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

const VectorSize = 3072

// SearchResult holds a single result from a vector similarity search.
type SearchResult struct {
	ProfileID uint64
	Score     float64
	Payload   map[string]any
}

// EmbeddingRepository manages the profile_embeddings table.
type EmbeddingRepository struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewEmbeddingRepository constructs an EmbeddingRepository.
func NewEmbeddingRepository(db *gorm.DB, logger *zap.Logger) *EmbeddingRepository {
	return &EmbeddingRepository{db: db, logger: logger.Named("embedding_repository")}
}

type profileEmbeddingRow struct {
	ProfileID uint64          `gorm:"column:profile_id;primaryKey"`
	UserID    uint64          `gorm:"column:user_id"`
	Embedding pgvector.Vector `gorm:"column:embedding;type:vector(3072)"`
	Payload   []byte          `gorm:"column:payload;type:jsonb"`
}

func (profileEmbeddingRow) TableName() string {
	return "profile_embeddings"
}

// UpsertProfile inserts or updates an embedding row for the given profile.
func (r *EmbeddingRepository) UpsertProfile(ctx context.Context, profile *models.Profile, embedding []float32) error {
	payloadBytes, err := json.Marshal(profile)
	if err != nil {
		return fmt.Errorf("failed to marshal profile payload: %w", err)
	}

	row := profileEmbeddingRow{
		ProfileID: profile.ID,
		UserID:    profile.UserID,
		Embedding: pgvector.NewVector(embedding),
		Payload:   payloadBytes,
	}

	result := r.db.WithContext(ctx).Exec(`
		INSERT INTO profile_embeddings (profile_id, user_id, embedding, payload, updated_at)
		VALUES (?, ?, ?, ?, NOW())
		ON CONFLICT (profile_id) DO UPDATE SET
			user_id    = EXCLUDED.user_id,
			embedding  = EXCLUDED.embedding,
			payload    = EXCLUDED.payload,
			updated_at = NOW()
	`, row.ProfileID, row.UserID, row.Embedding, row.Payload)

	if result.Error != nil {
		r.logger.Error("embedding upsert failed",
			zap.Uint64("profile_id", profile.ID),
			zap.Error(result.Error),
		)
		return result.Error
	}

	r.logger.Info("embedding upserted",
		zap.Uint64("profile_id", profile.ID),
		zap.Uint64("user_id", profile.UserID),
	)
	return nil
}

// DeleteProfile removes the embedding row for the given profile ID.
func (r *EmbeddingRepository) DeleteProfile(ctx context.Context, profileID uint64) error {
	result := r.db.WithContext(ctx).Exec(
		"DELETE FROM profile_embeddings WHERE profile_id = ?", profileID,
	)
	if result.Error != nil {
		r.logger.Error("embedding delete failed",
			zap.Uint64("profile_id", profileID),
			zap.Error(result.Error),
		)
		return result.Error
	}

	r.logger.Info("embedding deleted", zap.Uint64("profile_id", profileID))
	return nil
}

// SearchContext performs a cosine similarity search filtered by userID.
// Returns at most `limit` results ordered by similarity descending.
func (r *EmbeddingRepository) SearchContext(ctx context.Context, userID uint64, queryEmbedding []float32, limit int) ([]SearchResult, error) {
	vec := pgvector.NewVector(queryEmbedding)

	type row struct {
		ProfileID uint64  `gorm:"column:profile_id"`
		Score     float64 `gorm:"column:score"`
		Payload   []byte  `gorm:"column:payload"`
	}

	var rows []row
	result := r.db.WithContext(ctx).Raw(`
		SELECT profile_id,
		       1 - (embedding <=> ?) AS score,
		       payload
		FROM   profile_embeddings
		WHERE  user_id = ?
		ORDER  BY embedding <=> ?
		LIMIT  ?
	`, vec, userID, vec, limit).Scan(&rows)

	if result.Error != nil {
		return nil, fmt.Errorf("vector search failed: %w", result.Error)
	}

	results := make([]SearchResult, 0, len(rows))
	for _, row := range rows {
		var payload map[string]any
		if err := json.Unmarshal(row.Payload, &payload); err != nil {
			r.logger.Warn("failed to unmarshal embedding payload",
				zap.Uint64("profile_id", row.ProfileID),
				zap.Error(err),
			)
			continue
		}
		results = append(results, SearchResult{
			ProfileID: row.ProfileID,
			Score:     row.Score,
			Payload:   payload,
		})
	}

	return results, nil
}
