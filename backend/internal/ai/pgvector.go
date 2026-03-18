package ai

import (
	"context"
	"encoding/json"
	"fmt"

	"nexia-backend/internal/models"

	"github.com/pgvector/pgvector-go"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

const VectorSize = 3072 // gemini-embedding-001 dimension

// SearchResult holds a single result from a vector similarity search.
type SearchResult struct {
	ProfileID uint64
	Score     float64
	Payload   map[string]any
}

// PgVectorClient handles all vector operations using pgvector inside Postgres.
type PgVectorClient struct {
	db     *gorm.DB
	logger *zap.Logger
}

// NewPgVectorClient creates a new PgVectorClient that reuses the existing GORM connection.
func NewPgVectorClient(db *gorm.DB, logger *zap.Logger) *PgVectorClient {
	return &PgVectorClient{db: db, logger: logger.Named("pgvector")}
}

// profileEmbeddingRow maps to the profile_embeddings table.
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
// The payload stores a complete JSON snapshot of the profile (all fields + associations).
func (c *PgVectorClient) UpsertProfile(ctx context.Context, profile *models.Profile, embedding []float32) error {
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

	result := c.db.WithContext(ctx).Exec(`
		INSERT INTO profile_embeddings (profile_id, user_id, embedding, payload, updated_at)
		VALUES (?, ?, ?, ?, NOW())
		ON CONFLICT (profile_id) DO UPDATE SET
			user_id    = EXCLUDED.user_id,
			embedding  = EXCLUDED.embedding,
			payload    = EXCLUDED.payload,
			updated_at = NOW()
	`, row.ProfileID, row.UserID, row.Embedding, row.Payload)

	if result.Error != nil {
		c.logger.Error("pgvector upsert failed",
			zap.Uint64("profile_id", profile.ID),
			zap.Error(result.Error),
		)
		return result.Error
	}

	c.logger.Info("pgvector upserted profile",
		zap.Uint64("profile_id", profile.ID),
		zap.Uint64("user_id", profile.UserID),
	)
	return nil
}

// DeleteProfile removes the embedding row for the given profile ID.
func (c *PgVectorClient) DeleteProfile(ctx context.Context, profileID uint64) error {
	result := c.db.WithContext(ctx).Exec(
		"DELETE FROM profile_embeddings WHERE profile_id = ?", profileID,
	)
	if result.Error != nil {
		c.logger.Error("pgvector delete failed",
			zap.Uint64("profile_id", profileID),
			zap.Error(result.Error),
		)
		return result.Error
	}

	c.logger.Info("pgvector deleted profile", zap.Uint64("profile_id", profileID))
	return nil
}

// SearchContext performs a cosine similarity search filtered by userID.
// Returns at most `limit` results ordered by similarity descending.
func (c *PgVectorClient) SearchContext(ctx context.Context, userID uint64, queryEmbedding []float32, limit int) ([]SearchResult, error) {
	vec := pgvector.NewVector(queryEmbedding)

	type row struct {
		ProfileID uint64  `gorm:"column:profile_id"`
		Score     float64 `gorm:"column:score"`
		Payload   []byte  `gorm:"column:payload"`
	}

	var rows []row
	result := c.db.WithContext(ctx).Raw(`
		SELECT profile_id,
		       1 - (embedding <=> ?) AS score,
		       payload
		FROM   profile_embeddings
		WHERE  user_id = ?
		ORDER  BY embedding <=> ?
		LIMIT  ?
	`, vec, userID, vec, limit).Scan(&rows)

	if result.Error != nil {
		return nil, fmt.Errorf("pgvector search failed: %w", result.Error)
	}

	results := make([]SearchResult, 0, len(rows))
	for _, r := range rows {
		var payload map[string]any
		if err := json.Unmarshal(r.Payload, &payload); err != nil {
			c.logger.Warn("failed to unmarshal pgvector payload",
				zap.Uint64("profile_id", r.ProfileID),
				zap.Error(err),
			)
			continue
		}
		results = append(results, SearchResult{
			ProfileID: r.ProfileID,
			Score:     r.Score,
			Payload:   payload,
		})
	}

	return results, nil
}
