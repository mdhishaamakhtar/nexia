package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"nexia-backend/internal/ai"
	"nexia-backend/internal/models"
	"nexia-backend/internal/repositories"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type TaskHandler struct {
	db       *gorm.DB
	gemini   *ai.GeminiClient
	pgvector *ai.PgVectorClient
	logger   *zap.Logger
}

func NewTaskHandler(db *gorm.DB, gemini *ai.GeminiClient, pgvector *ai.PgVectorClient, logger *zap.Logger) *TaskHandler {
	return &TaskHandler{
		db:       db,
		gemini:   gemini,
		pgvector: pgvector,
		logger:   logger.Named("queue_worker"),
	}
}

func (h *TaskHandler) HandleEmbeddingTask(ctx context.Context, t *asynq.Task) error {
	var p EmbeddingPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	h.logger.Info("processing embedding task", zap.Uint("profile_id", p.ProfileID))

	var profile models.Profile
	if err := repositories.WithProfilePreloads(h.db).
		First(&profile, p.ProfileID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			h.logger.Warn("embedding task skipped: profile not found", zap.Uint("profile_id", p.ProfileID))
			return asynq.SkipRetry
		}
		return fmt.Errorf("fetching profile failed: %w", err)
	}

	// Construct comprehensive text to embed
	var sb strings.Builder
	fmt.Fprintf(&sb, "Profile of %s\n", profile.FullName)
	fmt.Fprintf(&sb, "Bio: %s\n", profile.Bio)
	fmt.Fprintf(&sb, "Profession: %s\n", profile.Profession)
	fmt.Fprintf(&sb, "Relationship Type: %s\n", profile.RelationshipType)
	if profile.ZodiacSign != nil {
		fmt.Fprintf(&sb, "Zodiac Sign: %s\n", *profile.ZodiacSign)
	}
	if profile.Birthday != nil {
		fmt.Fprintf(&sb, "Birthday: %s\n", time.Time(*profile.Birthday).Format("January 02, 2006"))
	}
	fmt.Fprintf(&sb, "Long Term Goals: %s\n", profile.LongTermGoals)
	fmt.Fprintf(&sb, "Music Preference: %s\n", profile.MusicPreference)
	fmt.Fprintf(&sb, "Favorite Movie: %s\n", profile.FavoriteMovie)
	fmt.Fprintf(&sb, "Favorite Book: %s\n", profile.FavoriteBook)
	fmt.Fprintf(&sb, "Favorite Memory: %s\n", profile.FavoriteMemory)

	if len(profile.Tags) > 0 {
		sb.WriteString("Interests/Tags: ")
		for i, t := range profile.Tags {
			sb.WriteString(t.Tag)
			if i < len(profile.Tags)-1 {
				sb.WriteString(", ")
			}
		}
		sb.WriteString("\n")
	}

	if len(profile.PoliticalViews) > 0 {
		sb.WriteString("Political Views: ")
		for i, v := range profile.PoliticalViews {
			sb.WriteString(v.View)
			if i < len(profile.PoliticalViews)-1 {
				sb.WriteString(", ")
			}
		}
		sb.WriteString("\n")
	}

	if len(profile.FoodRestrictions) > 0 {
		sb.WriteString("Food Restrictions: ")
		for i, f := range profile.FoodRestrictions {
			sb.WriteString(f.Restriction)
			if i < len(profile.FoodRestrictions)-1 {
				sb.WriteString(", ")
			}
		}
		sb.WriteString("\n")
	}

	if len(profile.MovieGenres) > 0 {
		sb.WriteString("Favorite Movie Genres: ")
		for i, g := range profile.MovieGenres {
			sb.WriteString(g.Genre)
			if i < len(profile.MovieGenres)-1 {
				sb.WriteString(", ")
			}
		}
		sb.WriteString("\n")
	}

	if len(profile.BookGenres) > 0 {
		sb.WriteString("Favorite Book Genres: ")
		for i, g := range profile.BookGenres {
			sb.WriteString(g.Genre)
			if i < len(profile.BookGenres)-1 {
				sb.WriteString(", ")
			}
		}
		sb.WriteString("\n")
	}

	if len(profile.HangoutPlaces) > 0 {
		sb.WriteString("Favorite Hangout Places: ")
		for i, p := range profile.HangoutPlaces {
			sb.WriteString(p.Place)
			if i < len(profile.HangoutPlaces)-1 {
				sb.WriteString(", ")
			}
		}
		sb.WriteString("\n")
	}

	if len(profile.TopSongs) > 0 {
		sb.WriteString("Top Songs: ")
		for i, song := range profile.TopSongs {
			fmt.Fprintf(&sb, "%s by %s", song.Name, song.Artist)
			if i < len(profile.TopSongs)-1 {
				sb.WriteString(", ")
			}
		}
		sb.WriteString("\n")
	}

	if profile.AssociatedSong != nil {
		fmt.Fprintf(&sb, "Associated Song: %s by %s\n", profile.AssociatedSong.Name, profile.AssociatedSong.Artist)
	}

	if len(profile.Quotes) > 0 {
		sb.WriteString("Quotes: ")
		for i, q := range profile.Quotes {
			fmt.Fprintf(&sb, "%q", q.Quote)
			if i < len(profile.Quotes)-1 {
				sb.WriteString(", ")
			}
		}
		sb.WriteString("\n")
	}

	textToEmbed := sb.String()

	embedding, err := h.gemini.GenerateEmbedding(ctx, textToEmbed)
	if err != nil {
		h.logger.Error("gemini embedding failed", zap.Uint("profile_id", p.ProfileID), zap.Error(err))
		return fmt.Errorf("gemini embedding failed: %w", err)
	}

	if err := h.pgvector.UpsertProfile(ctx, &profile, embedding); err != nil {
		h.logger.Error("pgvector upsert failed", zap.Uint("profile_id", p.ProfileID), zap.Error(err))
		return fmt.Errorf("pgvector upsert failed: %w", err)
	}

	h.logger.Info("embedding task completed",
		zap.Uint("profile_id", p.ProfileID),
		zap.Uint64("user_id", profile.UserID),
	)
	return nil
}

func (h *TaskHandler) HandleDeletionTask(ctx context.Context, t *asynq.Task) error {
	var p DeletionPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	h.logger.Info("processing deletion task", zap.Uint64("profile_id", p.ProfileID))

	if err := h.pgvector.DeleteProfile(ctx, p.ProfileID); err != nil {
		h.logger.Error("pgvector deletion failed", zap.Uint64("profile_id", p.ProfileID), zap.Error(err))
		return fmt.Errorf("pgvector deletion failed: %w", err)
	}

	h.logger.Info("deletion task completed", zap.Uint64("profile_id", p.ProfileID))
	return nil
}
