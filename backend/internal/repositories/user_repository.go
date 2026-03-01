package repositories

import (
	"nexia-backend/internal/models"

	"gorm.io/gorm"
)

type UserRepository struct {
	DB *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{DB: db}
}

func (r *UserRepository) Create(user *models.User) error {
	return r.DB.Create(user).Error
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByID(id uint64) (*models.User, error) {
	var user models.User
	err := r.DB.Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) UpdatePassword(userID uint64, hashedPassword string) error {
	return r.DB.Model(&models.User{}).Where("id = ?", userID).Update("password", hashedPassword).Error
}

func (r *UserRepository) UpdateEmailVerified(userID uint64) error {
	return r.DB.Model(&models.User{}).Where("id = ?", userID).Update("email_verified", true).Error
}
