package repositories

import (
	"nexia-backend/internal/models"

	"gorm.io/gorm"
)

// profileAssociations is the source of truth for all child associations.
var profileAssociations = []string{
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
	// GORM automatically handles inserting the parent and then the children
	// as long as the foreign keys are correctly defined in the models.
	return r.DB.Session(&gorm.Session{FullSaveAssociations: true}).Create(profile).Error
}

func (r *ProfileRepository) FindByID(id uint64, userID uint64) (*models.Profile, error) {
	var profile models.Profile
	query := withProfilePreloads(r.DB.Where("id = ? AND user_id = ?", id, userID))
	if err := query.First(&profile).Error; err != nil {
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
		// Ensure the profile exists and belongs to the user
		var existing models.Profile
		if err := tx.Where("id = ? AND user_id = ?", profile.ID, profile.UserID).First(&existing).Error; err != nil {
			return err
		}

		// FullSaveAssociations: true tells GORM to automatically
		// Delete/Update/Create associations to match the provided struct state (Replace).
		return tx.Session(&gorm.Session{FullSaveAssociations: true}).Save(profile).Error
	})
}

func (r *ProfileRepository) Delete(id uint64, userID uint64) error {
	// Since the database has ON DELETE CASCADE (see migrations),
	// we only need to delete the parent record.
	return r.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Profile{}).Error
}

func withProfilePreloads(query *gorm.DB) *gorm.DB {
	for _, preload := range profileAssociations {
		query = query.Preload(preload)
	}
	return query
}
