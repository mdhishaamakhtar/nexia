package services

import (
	"fmt"
	"time"

	"nexia-backend/internal/models"

	"go.uber.org/zap"
)

type ProfileService struct {
	Repo   ProfileRepository
	Queue  EmbeddingTaskQueue
	Logger *zap.Logger
}

type ProfileRepository interface {
	Create(profile *models.Profile) error
	FindByID(id uint64, userID uint64) (*models.Profile, error)
	FindAll(page, limit int, search string, relationshipType string, userID uint64) ([]models.Profile, int64, error)
	Update(profile *models.Profile) error
	Delete(id uint64, userID uint64) error
}

type EmbeddingTaskQueue interface {
	EnqueueEmbeddingTask(profileID uint) error
	EnqueueDeletionTask(profileID uint64) error
}

func NewProfileService(repo ProfileRepository, queue EmbeddingTaskQueue) *ProfileService {
	return NewProfileServiceWithLogger(repo, queue, zap.NewNop())
}

func NewProfileServiceWithLogger(repo ProfileRepository, queue EmbeddingTaskQueue, logger *zap.Logger) *ProfileService {
	if logger == nil {
		logger = zap.NewNop()
	}
	return &ProfileService{Repo: repo, Queue: queue, Logger: logger.Named("profile_service")}
}

func (s *ProfileService) CreateProfile(profile *models.Profile, userID uint64) error {
	profile.UserID = userID

	// Validate Top Songs (Max 3)
	if len(profile.TopSongs) > 3 {
		return fmt.Errorf("%w: cannot have more than 3 top songs", ErrValidation)
	}

	applyDerivedZodiac(profile)

	if err := s.Repo.Create(profile); err != nil {
		return err
	}

	// Async Embedding
	if s.Queue != nil {
		_ = s.Queue.EnqueueEmbeddingTask(uint(profile.ID))
	}

	return nil
}

func (s *ProfileService) GetProfile(id uint64, userID uint64) (*models.Profile, error) {
	return s.Repo.FindByID(id, userID)
}

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

func (s *ProfileService) UpdateProfile(id uint64, profile *models.Profile, userID uint64) error {
	// Ensure ID matches
	profile.ID = id
	profile.UserID = userID

	// Validate Top Songs (Max 3)
	if len(profile.TopSongs) > 3 {
		return fmt.Errorf("%w: cannot have more than 3 top songs", ErrValidation)
	}

	applyDerivedZodiac(profile)

	if err := s.Repo.Update(profile); err != nil {
		return err
	}

	// Async Embedding
	if s.Queue != nil {
		_ = s.Queue.EnqueueEmbeddingTask(uint(profile.ID))
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

func (s *ProfileService) DeleteProfile(id uint64, userID uint64) error {
	// Delete from database first
	if err := s.Repo.Delete(id, userID); err != nil {
		return err
	}

	// Async deletion from pgvector (vectorDB) via queue
	if s.Queue != nil {
		if err := s.Queue.EnqueueDeletionTask(id); err != nil {
			s.Logger.Warn("failed to enqueue profile deletion task",
				zap.Uint64("profile_id", id),
				zap.Error(err),
			)
		}
	}

	return nil
}

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
