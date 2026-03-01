package models

import "time"

type User struct {
	ID            uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Email         string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	EmailVerified bool      `gorm:"not null;default:false" json:"email_verified"`
	Password      string    `gorm:"type:varchar(255);not null" json:"-"` // Hide password in JSON
	CreatedAt     time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt     time.Time `gorm:"not null;default:CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" json:"updated_at"`
}
