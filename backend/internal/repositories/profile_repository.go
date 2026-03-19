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
	query := WithProfilePreloads(r.DB.Where("id = ? AND user_id = ?", id, userID))
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
		query = query.Where("LOWER(full_name) LIKE LOWER(?)", "%"+search+"%")
	}
	if relationshipType != "" {
		query = query.Where("relationship_type = ?", relationshipType)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := WithProfilePreloads(query).
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

		// UPSERT: items with a known id update in-place (ON CONFLICT DO UPDATE),
		// new items (id=0) are inserted and get fresh auto-increment ids.
		// After Save, GORM populates the fresh ids back into the slice elements.
		if err := tx.Session(&gorm.Session{FullSaveAssociations: true}).Save(profile).Error; err != nil {
			return err
		}

		// Prune stale children: rows that were in the DB but removed from the payload.
		return pruneStaleAssociations(tx, profile)
	})
}

// pruneStaleAssociations deletes has-many child rows whose id is not present in the
// incoming payload. This handles the case where the user removed items — the UPSERT
// above does not delete stale rows on its own.
// GORM populates fresh ids into the struct after the UPSERT (via RETURNING), so
// we can safely collect "which ids to keep" from the struct itself.
func pruneStaleAssociations(tx *gorm.DB, p *models.Profile) error {
	pid := p.ID

	type pruneTarget struct {
		model any
		ids   []uint64
	}

	targets := []pruneTarget{
		{&models.Tag{}, extractIDs(len(p.Tags), func(i int) uint64 { return p.Tags[i].ID })},
		{&models.PoliticalView{}, extractIDs(len(p.PoliticalViews), func(i int) uint64 { return p.PoliticalViews[i].ID })},
		{&models.FoodRestriction{}, extractIDs(len(p.FoodRestrictions), func(i int) uint64 { return p.FoodRestrictions[i].ID })},
		{&models.MovieGenre{}, extractIDs(len(p.MovieGenres), func(i int) uint64 { return p.MovieGenres[i].ID })},
		{&models.BookGenre{}, extractIDs(len(p.BookGenres), func(i int) uint64 { return p.BookGenres[i].ID })},
		{&models.HangoutPlace{}, extractIDs(len(p.HangoutPlaces), func(i int) uint64 { return p.HangoutPlaces[i].ID })},
		{&models.Quote{}, extractIDs(len(p.Quotes), func(i int) uint64 { return p.Quotes[i].ID })},
		{&models.TopSong{}, extractIDs(len(p.TopSongs), func(i int) uint64 { return p.TopSongs[i].ID })},
	}

	for _, t := range targets {
		q := tx.Where("profile_id = ?", pid)
		if len(t.ids) > 0 {
			q = q.Where("id NOT IN ?", t.ids)
		}
		if err := q.Delete(t.model).Error; err != nil {
			return err
		}
	}

	// AssociatedSong uses ProfileID as its PK (has-one). The UPSERT above handles the
	// non-nil case. If nil, explicitly delete so removal is persisted.
	if p.AssociatedSong == nil {
		if err := tx.Where("profile_id = ?", pid).Delete(&models.AssociatedSong{}).Error; err != nil {
			return err
		}
	}

	return nil
}

// extractIDs returns the non-zero ids from a slice, accessed via an index closure.
func extractIDs(n int, id func(int) uint64) []uint64 {
	result := make([]uint64, 0, n)
	for i := range n {
		if v := id(i); v > 0 {
			result = append(result, v)
		}
	}
	return result
}

func (r *ProfileRepository) Delete(id uint64, userID uint64) error {
	// Since the database has ON DELETE CASCADE (see migrations),
	// we only need to delete the parent record.
	return r.DB.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Profile{}).Error
}

func WithProfilePreloads(query *gorm.DB) *gorm.DB {
	for _, preload := range profileAssociations {
		query = query.Preload(preload)
	}
	return query
}
