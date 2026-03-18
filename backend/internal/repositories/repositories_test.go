package repositories_test

import (
	"fmt"
	"testing"

	"nexia-backend/internal/models"
	"nexia-backend/internal/repositories"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newRepositoryTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.Exec("PRAGMA foreign_keys = ON").Error; err != nil {
		t.Fatalf("enable foreign keys: %v", err)
	}

	for _, stmt := range []string{
		`CREATE TABLE users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT NOT NULL UNIQUE,
			email_verified NUMERIC NOT NULL DEFAULT 0,
			password TEXT NOT NULL,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE password_reset_tokens (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			token TEXT NOT NULL UNIQUE,
			expires_at DATETIME NOT NULL,
			used NUMERIC NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE email_verification_tokens (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			token TEXT NOT NULL UNIQUE,
			expires_at DATETIME NOT NULL,
			used NUMERIC NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE profiles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			full_name TEXT NOT NULL,
			bio TEXT,
			profession TEXT,
			long_term_goals TEXT,
			relationship_type TEXT NOT NULL,
			birthday DATE,
			zodiac_sign TEXT,
			music_preference TEXT,
			favorite_movie TEXT,
			favorite_book TEXT,
			favorite_memory TEXT,
			created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE tags (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			tag TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE political_views (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			view TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE food_restrictions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			restriction TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE movie_genres (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			genre TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE book_genres (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			genre TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE hangout_places (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			place TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE quotes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			quote TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE top_songs (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			profile_id INTEGER NOT NULL,
			name TEXT,
			artist TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE associated_songs (
			profile_id INTEGER PRIMARY KEY,
			name TEXT,
			artist TEXT,
			FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
		)`,
	} {
		if err := db.Exec(stmt).Error; err != nil {
			t.Fatalf("create schema: %v", err)
		}
	}

	return db
}

func createUser(t *testing.T, db *gorm.DB, email string) models.User {
	t.Helper()
	user := models.User{Email: email, Password: "hash"}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}
	return user
}

func TestUserRepository(t *testing.T) {
	db := newRepositoryTestDB(t)
	repo := repositories.NewUserRepository(db)

	user := &models.User{Email: "user@example.com", Password: "hash"}
	if err := repo.Create(user); err != nil {
		t.Fatalf("create user: %v", err)
	}
	if user.ID == 0 {
		t.Fatalf("expected user id")
	}

	foundByEmail, err := repo.FindByEmail("user@example.com")
	if err != nil {
		t.Fatalf("find by email: %v", err)
	}
	if foundByEmail.Email != "user@example.com" {
		t.Fatalf("unexpected email: %s", foundByEmail.Email)
	}

	foundByID, err := repo.FindByID(user.ID)
	if err != nil {
		t.Fatalf("find by id: %v", err)
	}
	if foundByID.ID != user.ID {
		t.Fatalf("unexpected id: %d", foundByID.ID)
	}

	if err := repo.UpdatePassword(user.ID, "new-hash"); err != nil {
		t.Fatalf("update password: %v", err)
	}
	if err := repo.UpdateEmailVerified(user.ID); err != nil {
		t.Fatalf("update email verified: %v", err)
	}

	updated, err := repo.FindByID(user.ID)
	if err != nil {
		t.Fatalf("find updated user: %v", err)
	}
	if updated.Password != "new-hash" || !updated.EmailVerified {
		t.Fatalf("user updates not persisted")
	}
}

func TestPasswordResetRepository(t *testing.T) {
	db := newRepositoryTestDB(t)
	user := createUser(t, db, "reset@example.com")
	repo := repositories.NewPasswordResetRepository(db)

	token := &models.PasswordResetToken{UserID: user.ID, Token: "reset-token", ExpiresAt: user.CreatedAt}
	if err := repo.Create(token); err != nil {
		t.Fatalf("create reset token: %v", err)
	}

	found, err := repo.FindByToken("reset-token")
	if err != nil {
		t.Fatalf("find reset token: %v", err)
	}
	if found.Token != "reset-token" {
		t.Fatalf("unexpected token: %s", found.Token)
	}

	if err := repo.MarkAsUsed(found.ID); err != nil {
		t.Fatalf("mark reset token used: %v", err)
	}

	reloaded, err := repo.FindByToken("reset-token")
	if err != nil {
		t.Fatalf("reload reset token: %v", err)
	}
	if !reloaded.Used {
		t.Fatalf("expected reset token to be marked used")
	}
}

func TestEmailVerificationRepository(t *testing.T) {
	db := newRepositoryTestDB(t)
	user := createUser(t, db, "verify@example.com")
	repo := repositories.NewEmailVerificationRepository(db)

	token := &models.EmailVerificationToken{UserID: user.ID, Token: "verify-token", ExpiresAt: user.CreatedAt}
	if err := repo.Create(token); err != nil {
		t.Fatalf("create verification token: %v", err)
	}

	found, err := repo.FindByToken("verify-token")
	if err != nil {
		t.Fatalf("find verification token: %v", err)
	}
	if found.Token != "verify-token" {
		t.Fatalf("unexpected token: %s", found.Token)
	}

	if err := repo.MarkAsUsed(found.ID); err != nil {
		t.Fatalf("mark verification token used: %v", err)
	}

	reloaded, err := repo.FindByToken("verify-token")
	if err != nil {
		t.Fatalf("reload verification token: %v", err)
	}
	if !reloaded.Used {
		t.Fatalf("expected verification token to be marked used")
	}
}

func TestProfileRepository(t *testing.T) {
	db := newRepositoryTestDB(t)
	user := createUser(t, db, "profile@example.com")
	repo := repositories.NewProfileRepository(db)

	profile := &models.Profile{
		UserID:           user.ID,
		FullName:         "Alice Example",
		RelationshipType: models.RelFriend,
		Tags:             []models.Tag{{Tag: "travel"}, {Tag: "music"}},
		Quotes:           []models.Quote{{Quote: "Keep going"}},
		TopSongs:         []models.TopSong{{Name: "Song A", Artist: "Artist A"}},
		AssociatedSong:   &models.AssociatedSong{Name: "Song B", Artist: "Artist B"},
	}
	if err := repo.Create(profile); err != nil {
		t.Fatalf("create profile: %v", err)
	}

	found, err := repo.FindByID(profile.ID, user.ID)
	if err != nil {
		t.Fatalf("find profile: %v", err)
	}
	if found.FullName != "Alice Example" || len(found.Tags) != 2 || found.AssociatedSong == nil {
		t.Fatalf("profile associations not loaded correctly")
	}

	list, total, err := repo.FindAll(1, 10, "alice", string(models.RelFriend), user.ID)
	if err != nil {
		t.Fatalf("list profiles: %v", err)
	}
	if total != 1 || len(list) != 1 {
		t.Fatalf("unexpected list result total=%d len=%d", total, len(list))
	}

	updated := &models.Profile{
		ID:               profile.ID,
		UserID:           user.ID,
		FullName:         "Alice Updated",
		RelationshipType: models.RelFriend,
		Tags:             []models.Tag{{ID: found.Tags[0].ID, Tag: "replaced"}},
		TopSongs:         []models.TopSong{{Name: "Song C", Artist: "Artist C"}},
	}
	if err := repo.Update(updated); err != nil {
		t.Fatalf("update profile: %v", err)
	}

	reloaded, err := repo.FindByID(profile.ID, user.ID)
	if err != nil {
		t.Fatalf("reload profile: %v", err)
	}
	if reloaded.FullName != "Alice Updated" {
		t.Fatalf("unexpected updated name: %s", reloaded.FullName)
	}
	if len(reloaded.Tags) != 1 || reloaded.Tags[0].Tag != "replaced" {
		t.Fatalf("expected tags to be replaced, got %+v", reloaded.Tags)
	}
	if reloaded.AssociatedSong != nil {
		t.Fatalf("expected associated song to be deleted when nil")
	}

	if err := repo.Delete(profile.ID, user.ID); err != nil {
		t.Fatalf("delete profile: %v", err)
	}
	if _, err := repo.FindByID(profile.ID, user.ID); err == nil {
		t.Fatalf("expected deleted profile to be missing")
	}
}
