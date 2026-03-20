package services

import (
	"context"
	"fmt"
	"time"

	"nexia-backend/internal/models"

	"go.uber.org/zap"
)

// ProfileService handles profile CRUD and coordinates async embedding updates.
// Queue may be nil when Redis is unconfigured — CRUD still works, RAG is disabled.
type ProfileService struct {
	Repo   ProfileRepository
	Queue  EmbeddingTaskQueue
	Logger *zap.Logger
}

// ProfileRepository is the data-access interface consumed by ProfileService.
// Defined here (the consuming package) per the project's interface-first DI convention.
type ProfileRepository interface {
	Create(profile *models.Profile) error
	FindByID(id uint64, userID uint64) (*models.Profile, error)
	FindAll(page, limit int, search string, relationshipType string, userID uint64) ([]models.Profile, int64, error)
	Update(profile *models.Profile) error
	Delete(id uint64, userID uint64) error
	// LoadForEmbedding loads a fully-preloaded profile without a userID guard.
	// Used by the background embedding worker which only has the profileID from the task payload.
	LoadForEmbedding(ctx context.Context, profileID uint) (*models.Profile, error)
}

// EmbeddingTaskQueue enqueues asynchronous embedding and deletion jobs via Redis/Asynq.
type EmbeddingTaskQueue interface {
	EnqueueEmbeddingTask(profileID uint) error
	EnqueueDeletionTask(profileID uint64) error
}

// NewProfileService constructs a ProfileService. Panics if logger is nil.
func NewProfileService(repo ProfileRepository, queue EmbeddingTaskQueue, logger *zap.Logger) *ProfileService {
	if logger == nil {
		panic("profile service requires a logger")
	}
	return &ProfileService{Repo: repo, Queue: queue, Logger: logger.Named("profile_service")}
}

// CreateProfile persists a new profile and enqueues an async embedding job.
func (s *ProfileService) CreateProfile(profile *models.Profile, userID uint64) error {
	profile.UserID = userID

	if len(profile.TopSongs) > 3 {
		return fmt.Errorf("%w: cannot have more than 3 top songs", ErrValidation)
	}

	applyDerivedZodiac(profile)

	if err := s.Repo.Create(profile); err != nil {
		return err
	}

	if s.Queue != nil {
		s.enqueueEmbeddingTask(profile.ID)
	}

	return nil
}

// GetProfile returns a profile by ID, enforcing ownership via userID.
func (s *ProfileService) GetProfile(id uint64, userID uint64) (*models.Profile, error) {
	return s.Repo.FindByID(id, userID)
}

// ListProfiles returns a paginated, optionally filtered list of profiles for the given user.
// Page and limit are clamped to sane defaults (1 and 10 respectively, max limit 100).
func (s *ProfileService) ListProfiles(page, limit int, search, relationshipType string, userID uint64) ([]models.Profile, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	return s.Repo.FindAll(page, limit, search, relationshipType, userID)
}

// UpdateProfile fully overwrites a profile and re-enqueues an embedding update.
func (s *ProfileService) UpdateProfile(id uint64, profile *models.Profile, userID uint64) error {
	profile.ID = id
	profile.UserID = userID

	if len(profile.TopSongs) > 3 {
		return fmt.Errorf("%w: cannot have more than 3 top songs", ErrValidation)
	}

	applyDerivedZodiac(profile)

	if err := s.Repo.Update(profile); err != nil {
		return err
	}

	if s.Queue != nil {
		s.enqueueEmbeddingTask(profile.ID)
	}

	return nil
}

func applyDerivedZodiac(profile *models.Profile) {
	// Normalize empty/zero birthdays so we persist NULL zodiac_sign instead of "".
	if profile.Birthday == nil || time.Time(*profile.Birthday).IsZero() {
		profile.Birthday = nil
		profile.ZodiacSign = nil
		return
	}
	sign := DeriveZodiac(time.Time(*profile.Birthday))
	profile.ZodiacSign = &sign
}

// DeleteProfile removes a profile from the database and asynchronously removes
// its embedding from the vector store. The DB deletion happens first so that a
// queue failure leaves no orphan data visible to the user.
func (s *ProfileService) DeleteProfile(id uint64, userID uint64) error {
	if err := s.Repo.Delete(id, userID); err != nil {
		return err
	}

	if s.Queue != nil {
		if err := s.Queue.EnqueueDeletionTask(id); err != nil {
			s.logQueueFailure("failed to enqueue profile deletion task", id, err)
		}
	}

	return nil
}

func (s *ProfileService) enqueueEmbeddingTask(profileID uint64) {
	if err := s.Queue.EnqueueEmbeddingTask(uint(profileID)); err != nil {
		s.logQueueFailure("failed to enqueue profile embedding task", profileID, err)
	}
}

func (s *ProfileService) logQueueFailure(message string, profileID uint64, err error) {
	s.Logger.Warn(message,
		zap.Uint64("profile_id", profileID),
		zap.Error(err),
	)
}

// DeriveZodiac returns the Western zodiac sign for the given date.
// Exported so the cmd/sync back-fill utility can call it directly.
func DeriveZodiac(date time.Time) models.ZodiacSign {
	day := date.Day()
	month := date.Month()

	switch month {
	case time.March:
		if day >= 21 {
			return models.ZodiacAries
		}
		return models.ZodiacPisces
	case time.April:
		if day >= 20 {
			return models.ZodiacTaurus
		}
		return models.ZodiacAries
	case time.May:
		if day >= 21 {
			return models.ZodiacGemini
		}
		return models.ZodiacTaurus
	case time.June:
		if day >= 21 {
			return models.ZodiacCancer
		}
		return models.ZodiacGemini
	case time.July:
		if day >= 23 {
			return models.ZodiacLeo
		}
		return models.ZodiacCancer
	case time.August:
		if day >= 23 {
			return models.ZodiacVirgo
		}
		return models.ZodiacLeo
	case time.September:
		if day >= 23 {
			return models.ZodiacLibra
		}
		return models.ZodiacVirgo
	case time.October:
		if day >= 23 {
			return models.ZodiacScorpio
		}
		return models.ZodiacLibra
	case time.November:
		if day >= 22 {
			return models.ZodiacSagittarius
		}
		return models.ZodiacScorpio
	case time.December:
		if day >= 22 {
			return models.ZodiacCapricorn
		}
		return models.ZodiacSagittarius
	case time.January:
		if day >= 20 {
			return models.ZodiacAquarius
		}
		return models.ZodiacCapricorn
	case time.February:
		if day >= 19 {
			return models.ZodiacPisces
		}
		return models.ZodiacAquarius
	default:
		return ""
	}
}
