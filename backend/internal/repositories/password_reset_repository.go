package repositories

import (
	"nexia-backend/internal/models"

	"gorm.io/gorm"
)

type PasswordResetRepository struct {
	DB *gorm.DB
}

func NewPasswordResetRepository(db *gorm.DB) *PasswordResetRepository {
	return &PasswordResetRepository{DB: db}
}

func (r *PasswordResetRepository) Create(token *models.PasswordResetToken) error {
	return r.DB.Create(token).Error
}

func (r *PasswordResetRepository) FindByToken(token string) (*models.PasswordResetToken, error) {
	var t models.PasswordResetToken
	err := r.DB.Where("token = ?", token).First(&t).Error
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *PasswordResetRepository) MarkAsUsed(id uint64) error {
	return r.DB.Model(&models.PasswordResetToken{}).Where("id = ?", id).Update("used", true).Error
}
