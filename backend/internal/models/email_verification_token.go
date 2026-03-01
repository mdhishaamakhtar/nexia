package models

import "time"

type EmailVerificationToken struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64    `gorm:"not null;index"           json:"user_id"`
	Token     string    `gorm:"type:varchar(64);uniqueIndex;not null" json:"token"`
	ExpiresAt time.Time `gorm:"not null"                 json:"expires_at"`
	Used      bool      `gorm:"not null;default:false"   json:"used"`
	CreatedAt time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
}
