package models

import (
	"time"
)

type RelationshipType string
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

type Profile struct {
	ID               uint64           `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID           uint64           `gorm:"not null;index" json:"user_id"`
	FullName         string           `gorm:"type:varchar(150);not null" json:"full_name"`
	Bio              string           `gorm:"type:text" json:"bio"`
	Profession       string           `gorm:"type:varchar(150)" json:"profession"`
	LongTermGoals    string           `gorm:"type:text" json:"long_term_goals"`
	RelationshipType RelationshipType `gorm:"type:enum('Friend','Family','Colleague','Classmate','Crush','Ex','Mentor','Other');not null" json:"relationship_type"`
	Birthday         *Date            `gorm:"type:date" json:"birthday"`
	ZodiacSign       ZodiacSign       `gorm:"type:enum('Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces')" json:"zodiac_sign"`
	MusicPreference  string           `gorm:"type:text" json:"music_preference"`
	FavoriteMovie    string           `gorm:"type:varchar(200)" json:"favorite_movie"`
	FavoriteBook     string           `gorm:"type:varchar(200)" json:"favorite_book"`
	FavoriteMemory   string           `gorm:"type:text" json:"favorite_memory"`
	CreatedAt        time.Time        `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt        time.Time        `gorm:"not null;default:CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" json:"updated_at"`

	// Child Associations
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

type TopSong struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement" json:"id"`
	ProfileID uint64 `gorm:"not null;index" json:"profile_id"`
	Name      string `gorm:"type:varchar(255)" json:"name"`
	Artist    string `gorm:"type:varchar(255)" json:"artist"`
}

type AssociatedSong struct {
	ProfileID uint64 `gorm:"primaryKey" json:"profile_id"`
	Name      string `gorm:"type:varchar(255)" json:"name"`
	Artist    string `gorm:"type:varchar(255)" json:"artist"`
}
