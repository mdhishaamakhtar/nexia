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

		// Save scalar profile fields only — associations are handled separately
		// to avoid GORM's Save+FullSaveAssociations appending duplicates instead of replacing.
		if err := tx.Omit(profileAssociations...).Save(profile).Error; err != nil {
			return err
		}

		return replaceProfileAssociations(tx, profile)
	})
}

// replaceProfileAssociations deletes all existing child rows for a profile then
// batch-inserts the new ones from the profile struct. This is the correct
// replace-semantics for GORM has-many associations when incoming items have ID=0.
func replaceProfileAssociations(tx *gorm.DB, profile *models.Profile) error {
	pid := profile.ID

	// Delete all existing children for every has-many association type.
	for _, model := range []any{
		&models.Tag{}, &models.PoliticalView{}, &models.FoodRestriction{},
		&models.MovieGenre{}, &models.BookGenre{}, &models.HangoutPlace{},
		&models.Quote{}, &models.TopSong{}, &models.AssociatedSong{},
	} {
		if err := tx.Where("profile_id = ?", pid).Delete(model).Error; err != nil {
			return err
		}
	}

	// Re-insert has-many slices with fresh IDs and correct ProfileID.
	for i := range profile.Tags {
		profile.Tags[i].ID = 0
		profile.Tags[i].ProfileID = pid
	}
	if len(profile.Tags) > 0 {
		if err := tx.Create(&profile.Tags).Error; err != nil {
			return err
		}
	}

	for i := range profile.PoliticalViews {
		profile.PoliticalViews[i].ID = 0
		profile.PoliticalViews[i].ProfileID = pid
	}
	if len(profile.PoliticalViews) > 0 {
		if err := tx.Create(&profile.PoliticalViews).Error; err != nil {
			return err
		}
	}

	for i := range profile.FoodRestrictions {
		profile.FoodRestrictions[i].ID = 0
		profile.FoodRestrictions[i].ProfileID = pid
	}
	if len(profile.FoodRestrictions) > 0 {
		if err := tx.Create(&profile.FoodRestrictions).Error; err != nil {
			return err
		}
	}

	for i := range profile.MovieGenres {
		profile.MovieGenres[i].ID = 0
		profile.MovieGenres[i].ProfileID = pid
	}
	if len(profile.MovieGenres) > 0 {
		if err := tx.Create(&profile.MovieGenres).Error; err != nil {
			return err
		}
	}

	for i := range profile.BookGenres {
		profile.BookGenres[i].ID = 0
		profile.BookGenres[i].ProfileID = pid
	}
	if len(profile.BookGenres) > 0 {
		if err := tx.Create(&profile.BookGenres).Error; err != nil {
			return err
		}
	}

	for i := range profile.HangoutPlaces {
		profile.HangoutPlaces[i].ID = 0
		profile.HangoutPlaces[i].ProfileID = pid
	}
	if len(profile.HangoutPlaces) > 0 {
		if err := tx.Create(&profile.HangoutPlaces).Error; err != nil {
			return err
		}
	}

	for i := range profile.Quotes {
		profile.Quotes[i].ID = 0
		profile.Quotes[i].ProfileID = pid
	}
	if len(profile.Quotes) > 0 {
		if err := tx.Create(&profile.Quotes).Error; err != nil {
			return err
		}
	}

	for i := range profile.TopSongs {
		profile.TopSongs[i].ID = 0
		profile.TopSongs[i].ProfileID = pid
	}
	if len(profile.TopSongs) > 0 {
		if err := tx.Create(&profile.TopSongs).Error; err != nil {
			return err
		}
	}

	// AssociatedSong uses ProfileID as its primary key (has-one).
	if profile.AssociatedSong != nil {
		profile.AssociatedSong.ProfileID = pid
		if err := tx.Create(profile.AssociatedSong).Error; err != nil {
			return err
		}
	}

	return nil
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
