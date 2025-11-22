package repositories

import (
	"nexia-backend/internal/models"

	"gorm.io/gorm"
)

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
	err := r.DB.Where("id = ? AND user_id = ?", id, userID).
		Preload("Tags").
		Preload("PoliticalViews").
		Preload("FoodRestrictions").
		Preload("MovieGenres").
		Preload("BookGenres").
		Preload("HangoutPlaces").
		Preload("Quotes").
		Preload("TopSongs").
		Preload("AssociatedSong").
		First(&profile, id).Error
	if err != nil {
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
	err := query.Offset(offset).Limit(limit).Preload("Tags").
		Preload("PoliticalViews").
		Preload("FoodRestrictions").
		Preload("MovieGenres").
		Preload("BookGenres").
		Preload("HangoutPlaces").
		Preload("Quotes").
		Preload("TopSongs").
		Preload("AssociatedSong").
		Find(&profiles).Error

	return profiles, total, err
}

func (r *ProfileRepository) Update(profile *models.Profile) error {
	return r.DB.Transaction(func(tx *gorm.DB) error {
		// Ensure the profile belongs to the user
		var count int64
		if err := tx.Model(&models.Profile{}).Where("id = ? AND user_id = ?", profile.ID, profile.UserID).Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			return gorm.ErrRecordNotFound
		}

		// 1. Update Profile fields
		if err := tx.Model(profile).Updates(profile).Error; err != nil {
			return err
		}

		// 2. Delete all child rows
		// We need to delete based on ProfileID for each child table
		if err := tx.Where("profile_id = ?", profile.ID).Delete(&models.Tag{}).Error; err != nil {
			return err
		}
		if err := tx.Where("profile_id = ?", profile.ID).Delete(&models.PoliticalView{}).Error; err != nil {
			return err
		}
		if err := tx.Where("profile_id = ?", profile.ID).Delete(&models.FoodRestriction{}).Error; err != nil {
			return err
		}
		if err := tx.Where("profile_id = ?", profile.ID).Delete(&models.MovieGenre{}).Error; err != nil {
			return err
		}
		if err := tx.Where("profile_id = ?", profile.ID).Delete(&models.BookGenre{}).Error; err != nil {
			return err
		}
		if err := tx.Where("profile_id = ?", profile.ID).Delete(&models.HangoutPlace{}).Error; err != nil {
			return err
		}
		if err := tx.Where("profile_id = ?", profile.ID).Delete(&models.Quote{}).Error; err != nil {
			return err
		}
		if err := tx.Where("profile_id = ?", profile.ID).Delete(&models.TopSong{}).Error; err != nil {
			return err
		}
		if err := tx.Where("profile_id = ?", profile.ID).Delete(&models.AssociatedSong{}).Error; err != nil {
			return err
		}

		// 3. Re-insert all child rows
		// We need to ensure ProfileID is set for all children
		for i := range profile.Tags {
			profile.Tags[i].ProfileID = profile.ID
		}
		if len(profile.Tags) > 0 {
			if err := tx.Create(&profile.Tags).Error; err != nil {
				return err
			}
		}

		for i := range profile.PoliticalViews {
			profile.PoliticalViews[i].ProfileID = profile.ID
		}
		if len(profile.PoliticalViews) > 0 {
			if err := tx.Create(&profile.PoliticalViews).Error; err != nil {
				return err
			}
		}

		for i := range profile.FoodRestrictions {
			profile.FoodRestrictions[i].ProfileID = profile.ID
		}
		if len(profile.FoodRestrictions) > 0 {
			if err := tx.Create(&profile.FoodRestrictions).Error; err != nil {
				return err
			}
		}

		for i := range profile.MovieGenres {
			profile.MovieGenres[i].ProfileID = profile.ID
		}
		if len(profile.MovieGenres) > 0 {
			if err := tx.Create(&profile.MovieGenres).Error; err != nil {
				return err
			}
		}

		for i := range profile.BookGenres {
			profile.BookGenres[i].ProfileID = profile.ID
		}
		if len(profile.BookGenres) > 0 {
			if err := tx.Create(&profile.BookGenres).Error; err != nil {
				return err
			}
		}

		for i := range profile.HangoutPlaces {
			profile.HangoutPlaces[i].ProfileID = profile.ID
		}
		if len(profile.HangoutPlaces) > 0 {
			if err := tx.Create(&profile.HangoutPlaces).Error; err != nil {
				return err
			}
		}

		for i := range profile.Quotes {
			profile.Quotes[i].ProfileID = profile.ID
		}
		if len(profile.Quotes) > 0 {
			if err := tx.Create(&profile.Quotes).Error; err != nil {
				return err
			}
		}

		for i := range profile.TopSongs {
			profile.TopSongs[i].ProfileID = profile.ID
		}
		if len(profile.TopSongs) > 0 {
			if err := tx.Create(&profile.TopSongs).Error; err != nil {
				return err
			}
		}

		if profile.AssociatedSong != nil {
			profile.AssociatedSong.ProfileID = profile.ID
			if err := tx.Create(profile.AssociatedSong).Error; err != nil {
				return err
			}
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
