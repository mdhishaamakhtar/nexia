package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"nexia-backend/internal/models"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// EmbeddingService is the background worker that converts profiles into vector embeddings
// and persists them to the profile_embeddings table for RAG retrieval.
type EmbeddingService struct {
	Profiles  ProfileRepository
	Generator EmbeddingGenerator
	Repo      EmbeddingRepository
	Logger    *zap.Logger
}

// EmbeddingGenerator generates a vector embedding from text.
type EmbeddingGenerator interface {
	GenerateEmbedding(ctx context.Context, text string) ([]float32, error)
}

// EmbeddingRepository persists and removes profile vector embeddings.
type EmbeddingRepository interface {
	UpsertProfile(ctx context.Context, profile *models.Profile, embedding []float32) error
	DeleteProfile(ctx context.Context, profileID uint64) error
}

// NewEmbeddingService constructs an EmbeddingService.
func NewEmbeddingService(profiles ProfileRepository, generator EmbeddingGenerator, repo EmbeddingRepository, logger *zap.Logger) *EmbeddingService {
	return &EmbeddingService{
		Profiles:  profiles,
		Generator: generator,
		Repo:      repo,
		Logger:    logger.Named("embedding_service"),
	}
}

// EmbedProfile loads a profile, generates its embedding, and upserts it into the vector store.
// Returns ErrNotFound if the profile no longer exists (caller should skip retry).
func (s *EmbeddingService) EmbedProfile(ctx context.Context, profileID uint) error {
	profile, err := s.Profiles.LoadForEmbedding(ctx, profileID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrNotFound
		}
		return fmt.Errorf("fetching profile failed: %w", err)
	}

	text := buildEmbeddingText(profile)

	embedding, err := s.Generator.GenerateEmbedding(ctx, text)
	if err != nil {
		s.Logger.Error("embedding generation failed", zap.Uint("profile_id", profileID), zap.Error(err))
		return fmt.Errorf("gemini embedding failed: %w", err)
	}

	if err := s.Repo.UpsertProfile(ctx, profile, embedding); err != nil {
		s.Logger.Error("embedding upsert failed", zap.Uint("profile_id", profileID), zap.Error(err))
		return fmt.Errorf("pgvector upsert failed: %w", err)
	}

	s.Logger.Info("profile embedded",
		zap.Uint("profile_id", profileID),
		zap.Uint64("user_id", profile.UserID),
	)
	return nil
}

// DeleteEmbedding removes a profile's vector embedding from the store.
func (s *EmbeddingService) DeleteEmbedding(ctx context.Context, profileID uint64) error {
	return s.Repo.DeleteProfile(ctx, profileID)
}

// buildEmbeddingText flattens a fully-preloaded profile into a single string for embedding.
func buildEmbeddingText(profile *models.Profile) string {
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

	return sb.String()
}
