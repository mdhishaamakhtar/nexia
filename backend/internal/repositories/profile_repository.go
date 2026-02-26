package repositories

import (
	"nexia-backend/internal/models"

	"gorm.io/gorm"
)

var profilePreloads = []string{
	"Tags",
	"PoliticalViews",
	"FoodRestrictions",
	"MovieGenres",
	"BookGenres",
	"HangoutPlaces",
	"Quotes",
	"TopSongs",
	"AssociatedSong",
}

type ProfileRepository struct {
	DB *gorm.DB
}

func NewProfileRepository(db *gorm.DB) *ProfileRepository {
	return &ProfileRepository{DB: db}
}

func (r *ProfileRepository) Create(profile *models.Profile) error {
	return r.DB.Create(profile).Error
}

func (r *ProfileRepository) FindByID(id uint64, userID uint64) (*models.Profile, error) {
	var profile models.Profile
	query := withProfilePreloads(r.DB.Where("id = ? AND user_id = ?", id, userID))
	if err := query.First(&profile, id).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (r *ProfileRepository) FindAll(page, limit int, search string, relationshipType string, userID uint64) ([]models.Profile, int64, error) {
	var profiles []models.Profile
	var total int64

	query := r.DB.Model(&models.Profile{}).Where("user_id = ?", userID)
	if search != "" {
		query = query.Where("full_name LIKE ?", "%"+search+"%")
	}
	if relationshipType != "" {
		query = query.Where("relationship_type = ?", relationshipType)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := withProfilePreloads(query).
		Offset(offset).
		Limit(limit).
		Find(&profiles).Error; err != nil {
		return nil, 0, err
	}

	return profiles, total, nil
}

func (r *ProfileRepository) Update(profile *models.Profile) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ? AND user_id = ?", profile.ID, profile.UserID).First(&models.Profile{}).Error; err != nil {
			return err
		}

		// Update scalar fields only.
		if err := tx.Model(&models.Profile{}).
			Where("id = ? AND user_id = ?", profile.ID, profile.UserID).
			Updates(map[string]interface{}{
				"full_name":         profile.FullName,
				"bio":               profile.Bio,
				"profession":        profile.Profession,
				"long_term_goals":   profile.LongTermGoals,
				"relationship_type": profile.RelationshipType,
				"birthday":          profile.Birthday,
				"zodiac_sign":       profile.ZodiacSign,
				"music_preference":  profile.MusicPreference,
				"favorite_movie":    profile.FavoriteMovie,
				"favorite_book":     profile.FavoriteBook,
				"favorite_memory":   profile.FavoriteMemory,
			}).Error; err != nil {
			return err
		}

		if err := replaceTagAssociations(tx, profile); err != nil {
			return err
		}
		if err := replacePoliticalViewAssociations(tx, profile); err != nil {
			return err
		}
		if err := replaceFoodRestrictionAssociations(tx, profile); err != nil {
			return err
		}
		if err := replaceMovieGenreAssociations(tx, profile); err != nil {
			return err
		}
		if err := replaceBookGenreAssociations(tx, profile); err != nil {
			return err
		}
		if err := replaceHangoutPlaceAssociations(tx, profile); err != nil {
			return err
		}
		if err := replaceQuoteAssociations(tx, profile); err != nil {
			return err
		}
		if err := replaceTopSongAssociations(tx, profile); err != nil {
			return err
		}
		if err := replaceAssociatedSong(tx, profile); err != nil {
			return err
		}

		return nil
	})
}

func (r *ProfileRepository) Delete(id uint64, userID uint64) error {
	return r.DB.Select(
		"Tags",
		"PoliticalViews",
		"FoodRestrictions",
		"MovieGenres",
		"BookGenres",
		"HangoutPlaces",
		"Quotes",
		"TopSongs",
		"AssociatedSong",
	).Where("id = ? AND user_id = ?", id, userID).Delete(&models.Profile{}).Error
}

func withProfilePreloads(query *gorm.DB) *gorm.DB {
	for _, preload := range profilePreloads {
		query = query.Preload(preload)
	}
	return query
}

func replaceTagAssociations(tx *gorm.DB, profile *models.Profile) error {
	for i := range profile.Tags {
		profile.Tags[i].ProfileID = profile.ID
	}
	return tx.Model(profile).Association("Tags").Replace(profile.Tags)
}

func replacePoliticalViewAssociations(tx *gorm.DB, profile *models.Profile) error {
	for i := range profile.PoliticalViews {
		profile.PoliticalViews[i].ProfileID = profile.ID
	}
	return tx.Model(profile).Association("PoliticalViews").Replace(profile.PoliticalViews)
}

func replaceFoodRestrictionAssociations(tx *gorm.DB, profile *models.Profile) error {
	for i := range profile.FoodRestrictions {
		profile.FoodRestrictions[i].ProfileID = profile.ID
	}
	return tx.Model(profile).Association("FoodRestrictions").Replace(profile.FoodRestrictions)
}

func replaceMovieGenreAssociations(tx *gorm.DB, profile *models.Profile) error {
	for i := range profile.MovieGenres {
		profile.MovieGenres[i].ProfileID = profile.ID
	}
	return tx.Model(profile).Association("MovieGenres").Replace(profile.MovieGenres)
}

func replaceBookGenreAssociations(tx *gorm.DB, profile *models.Profile) error {
	for i := range profile.BookGenres {
		profile.BookGenres[i].ProfileID = profile.ID
	}
	return tx.Model(profile).Association("BookGenres").Replace(profile.BookGenres)
}

func replaceHangoutPlaceAssociations(tx *gorm.DB, profile *models.Profile) error {
	for i := range profile.HangoutPlaces {
		profile.HangoutPlaces[i].ProfileID = profile.ID
	}
	return tx.Model(profile).Association("HangoutPlaces").Replace(profile.HangoutPlaces)
}

func replaceQuoteAssociations(tx *gorm.DB, profile *models.Profile) error {
	for i := range profile.Quotes {
		profile.Quotes[i].ProfileID = profile.ID
	}
	return tx.Model(profile).Association("Quotes").Replace(profile.Quotes)
}

func replaceTopSongAssociations(tx *gorm.DB, profile *models.Profile) error {
	for i := range profile.TopSongs {
		profile.TopSongs[i].ProfileID = profile.ID
	}
	return tx.Model(profile).Association("TopSongs").Replace(profile.TopSongs)
}

func replaceAssociatedSong(tx *gorm.DB, profile *models.Profile) error {
	if profile.AssociatedSong != nil {
		profile.AssociatedSong.ProfileID = profile.ID
	}
	return tx.Model(profile).Association("AssociatedSong").Replace(profile.AssociatedSong)
}
