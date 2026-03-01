package repositories

import (
	"nexia-backend/internal/models"

	"gorm.io/gorm"
)

type EmailVerificationRepository struct {
	DB *gorm.DB
}

func NewEmailVerificationRepository(db *gorm.DB) *EmailVerificationRepository {
	return &EmailVerificationRepository{DB: db}
}

func (r *EmailVerificationRepository) Create(token *models.EmailVerificationToken) error {
	return r.DB.Create(token).Error
}

func (r *EmailVerificationRepository) FindByToken(token string) (*models.EmailVerificationToken, error) {
	var t models.EmailVerificationToken
	err := r.DB.Where("token = ?", token).First(&t).Error
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *EmailVerificationRepository) MarkAsUsed(id uint64) error {
	return r.DB.Model(&models.EmailVerificationToken{}).Where("id = ?", id).Update("used", true).Error
}
