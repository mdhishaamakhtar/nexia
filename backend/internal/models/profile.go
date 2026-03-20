package models

import (
	"time"
)

// RelationshipType classifies how the profile owner knows the person being described.
type RelationshipType string

// ZodiacSign is derived automatically from Birthday by applyDerivedZodiac — never set it directly.
type ZodiacSign string

const (
	RelFriend    RelationshipType = "Friend"
	RelFamily    RelationshipType = "Family"
	RelColleague RelationshipType = "Colleague"
	RelClassmate RelationshipType = "Classmate"
	RelCrush     RelationshipType = "Crush"
	RelEx        RelationshipType = "Ex"
	RelMentor    RelationshipType = "Mentor"
	RelOther     RelationshipType = "Other"

	ZodiacAries       ZodiacSign = "Aries"
	ZodiacTaurus      ZodiacSign = "Taurus"
	ZodiacGemini      ZodiacSign = "Gemini"
	ZodiacCancer      ZodiacSign = "Cancer"
	ZodiacLeo         ZodiacSign = "Leo"
	ZodiacVirgo       ZodiacSign = "Virgo"
	ZodiacLibra       ZodiacSign = "Libra"
	ZodiacScorpio     ZodiacSign = "Scorpio"
	ZodiacSagittarius ZodiacSign = "Sagittarius"
	ZodiacCapricorn   ZodiacSign = "Capricorn"
	ZodiacAquarius    ZodiacSign = "Aquarius"
	ZodiacPisces      ZodiacSign = "Pisces"
)

// Profile is the core entity representing a person in the user's network.
// All child associations (Tags, Songs, etc.) are eagerly loaded and stored
// in separate tables with ON DELETE CASCADE so deleting a Profile cleans up
// everything automatically.
type Profile struct {
	ID               uint64           `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID           uint64           `gorm:"not null;index" json:"user_id"`
	FullName         string           `gorm:"type:varchar(150);not null" json:"full_name"`
	Bio              string           `gorm:"type:text" json:"bio"`
	Profession       string           `gorm:"type:varchar(150)" json:"profession"`
	LongTermGoals    string           `gorm:"type:text" json:"long_term_goals"`
	RelationshipType RelationshipType `gorm:"type:varchar(50);not null" json:"relationship_type"`
	Birthday         *Date            `gorm:"type:date" json:"birthday"`
	ZodiacSign       *ZodiacSign      `gorm:"type:varchar(50)" json:"zodiac_sign"`
	MusicPreference  string           `gorm:"type:text" json:"music_preference"`
	FavoriteMovie    string           `gorm:"type:varchar(200)" json:"favorite_movie"`
	FavoriteBook     string           `gorm:"type:varchar(200)" json:"favorite_book"`
	FavoriteMemory   string           `gorm:"type:text" json:"favorite_memory"`
	CreatedAt        time.Time        `gorm:"not null;default:now()" json:"created_at"`
	UpdatedAt        time.Time        `gorm:"not null;default:now()" json:"updated_at"`

	Tags             []Tag             `gorm:"foreignKey:ProfileID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"tags"`
	PoliticalViews   []PoliticalView   `gorm:"foreignKey:ProfileID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"political_views"`
	FoodRestrictions []FoodRestriction `gorm:"foreignKey:ProfileID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"food_restrictions"`
	MovieGenres      []MovieGenre      `gorm:"foreignKey:ProfileID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"movie_genres"`
	BookGenres       []BookGenre       `gorm:"foreignKey:ProfileID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"book_genres"`
	HangoutPlaces    []HangoutPlace    `gorm:"foreignKey:ProfileID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"hangout_places"`
	Quotes           []Quote           `gorm:"foreignKey:ProfileID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"quotes"`
	TopSongs         []TopSong         `gorm:"foreignKey:ProfileID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"top_songs"`
	AssociatedSong   *AssociatedSong   `gorm:"foreignKey:ProfileID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"associated_song"`
}

type Tag struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProfileID uint64 `gorm:"not null;index" json:"profile_id"`
	Tag       string `gorm:"type:varchar(255)" json:"tag"`
}

type PoliticalView struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProfileID uint64 `gorm:"not null;index" json:"profile_id"`
	View      string `gorm:"type:varchar(255)" json:"view"`
}

type FoodRestriction struct {
	ID          uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProfileID   uint64 `gorm:"not null;index" json:"profile_id"`
	Restriction string `gorm:"type:varchar(255)" json:"restriction"`
}

type MovieGenre struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProfileID uint64 `gorm:"not null;index" json:"profile_id"`
	Genre     string `gorm:"type:varchar(255)" json:"genre"`
}

type BookGenre struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProfileID uint64 `gorm:"not null;index" json:"profile_id"`
	Genre     string `gorm:"type:varchar(255)" json:"genre"`
}

type HangoutPlace struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProfileID uint64 `gorm:"not null;index" json:"profile_id"`
	Place     string `gorm:"type:varchar(255)" json:"place"`
}

type Quote struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProfileID uint64 `gorm:"not null;index" json:"profile_id"`
	Quote     string `gorm:"type:text" json:"quote"`
}

// TopSong is limited to 3 per profile, enforced in the service layer.
type TopSong struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProfileID uint64 `gorm:"not null;index" json:"profile_id"`
	Name      string `gorm:"type:varchar(255)" json:"name"`
	Artist    string `gorm:"type:varchar(255)" json:"artist"`
}

// AssociatedSong is the one song that "defines" the person. It uses ProfileID as its primary
// key (has-one, not has-many), so there is at most one row per profile.
type AssociatedSong struct {
	ProfileID uint64 `gorm:"primaryKey" json:"profile_id"`
	Name      string `gorm:"type:varchar(255)" json:"name"`
	Artist    string `gorm:"type:varchar(255)" json:"artist"`
}
