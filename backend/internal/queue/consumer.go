package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"nexia-backend/internal/ai"
	"nexia-backend/internal/models"

	"github.com/hibiken/asynq"
	"gorm.io/gorm"
)

type TaskHandler struct {
	db     *gorm.DB
	gemini *ai.GeminiClient
	qdrant *ai.QdrantClient
}

func NewTaskHandler(db *gorm.DB, gemini *ai.GeminiClient, qdrant *ai.QdrantClient) *TaskHandler {
	return &TaskHandler{
		db:     db,
		gemini: gemini,
		qdrant: qdrant,
	}
}

func (h *TaskHandler) HandleEmbeddingTask(ctx context.Context, t *asynq.Task) error {
	var p EmbeddingPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("json.Unmarshal failed: %v: %w", err, asynq.SkipRetry)
	}

	log.Printf("Processing embedding task for ProfileID: %d", p.ProfileID)

	var profile models.Profile
	if err := h.db.
		Preload("Tags").
		Preload("PoliticalViews").
		Preload("FoodRestrictions").
		Preload("MovieGenres").
		Preload("BookGenres").
		Preload("HangoutPlaces").
		Preload("Quotes").
		Preload("TopSongs").
		Preload("AssociatedSong").
		First(&profile, p.ProfileID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			log.Printf("⚠️ ProfileID %d not found, skipping task.", p.ProfileID)
			return asynq.SkipRetry
		}
		return fmt.Errorf("fetching profile failed: %w", err)
	}

	// Construct comprehensive text to embed
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Profile of %s\n", profile.FullName))
	sb.WriteString(fmt.Sprintf("Bio: %s\n", profile.Bio))
	sb.WriteString(fmt.Sprintf("Profession: %s\n", profile.Profession))
	sb.WriteString(fmt.Sprintf("Relationship Type: %s\n", profile.RelationshipType))
	sb.WriteString(fmt.Sprintf("Zodiac Sign: %s\n", profile.ZodiacSign))
	if profile.Birthday != nil {
		sb.WriteString(fmt.Sprintf("Birthday: %s\n", time.Time(*profile.Birthday).Format("January 02, 2006")))
	}
	sb.WriteString(fmt.Sprintf("Long Term Goals: %s\n", profile.LongTermGoals))
	sb.WriteString(fmt.Sprintf("Music Preference: %s\n", profile.MusicPreference))
	sb.WriteString(fmt.Sprintf("Favorite Movie: %s\n", profile.FavoriteMovie))
	sb.WriteString(fmt.Sprintf("Favorite Book: %s\n", profile.FavoriteBook))
	sb.WriteString(fmt.Sprintf("Favorite Memory: %s\n", profile.FavoriteMemory))

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
			sb.WriteString(fmt.Sprintf("%s by %s", song.Name, song.Artist))
			if i < len(profile.TopSongs)-1 {
				sb.WriteString(", ")
			}
		}
		sb.WriteString("\n")
	}

	if profile.AssociatedSong != nil {
		sb.WriteString(fmt.Sprintf("Associated Song: %s by %s\n", profile.AssociatedSong.Name, profile.AssociatedSong.Artist))
	}

	if len(profile.Quotes) > 0 {
		sb.WriteString("Quotes: ")
		for i, q := range profile.Quotes {
			sb.WriteString(fmt.Sprintf("\"%s\"", q.Quote))
			if i < len(profile.Quotes)-1 {
				sb.WriteString(", ")
			}
		}
		sb.WriteString("\n")
	}

	textToEmbed := sb.String()

	embedding, err := h.gemini.GenerateEmbedding(ctx, textToEmbed)
	if err != nil {
		log.Printf("ERROR: Gemini embedding failed for ProfileID %d: %v", p.ProfileID, err)
		return fmt.Errorf("gemini embedding failed: %w", err)
	}

	if err := h.qdrant.UpsertProfile(ctx, &profile, embedding); err != nil {
		log.Printf("ERROR: Qdrant upsert failed for ProfileID %d: %v", p.ProfileID, err)
		return fmt.Errorf("qdrant upsert failed: %w", err)
	}

	log.Printf("✅ Successfully embedded and indexed ProfileID: %d for UserID: %d", p.ProfileID, profile.UserID)
	return nil
}
