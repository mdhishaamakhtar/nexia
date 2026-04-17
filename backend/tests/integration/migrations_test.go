package integration_test

import (
	"context"
	"testing"

	"github.com/golang-migrate/migrate/v4"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	gormPostgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// rawMigrationDB returns a DB and connStr in a vanilla state (no migrations
// applied, pgvector extension pre-installed). Each migration test gets its own
// container so up/down state cannot bleed between tests.
func rawMigrationDB(t *testing.T) (*gorm.DB, string) {
	t.Helper()
	ctx := context.Background()

	pgContainer, err := postgres.Run(ctx,
		"pgvector/pgvector:pg16",
		postgres.WithDatabase("nexia"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("secret"),
		postgres.BasicWaitStrategies(),
	)
	if err != nil {
		t.Fatalf("run postgres container: %v", err)
	}
	t.Cleanup(func() { _ = pgContainer.Terminate(ctx) })

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("connection string: %v", err)
	}

	db, err := gorm.Open(gormPostgres.Open(connStr), &gorm.Config{})
	if err != nil {
		t.Fatalf("open postgres: %v", err)
	}
	if err := db.Exec("CREATE EXTENSION IF NOT EXISTS vector").Error; err != nil {
		t.Fatalf("create vector extension: %v", err)
	}
	return db, connStr
}

func tableExists(t *testing.T, db *gorm.DB, table string) bool {
	t.Helper()
	var exists bool
	if err := db.Raw(
		"SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=?)",
		table,
	).Scan(&exists).Error; err != nil {
		t.Fatalf("table exists (%s): %v", table, err)
	}
	return exists
}

func columnExists(t *testing.T, db *gorm.DB, table, column string) bool {
	t.Helper()
	var exists bool
	if err := db.Raw(
		"SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=? AND column_name=?)",
		table, column,
	).Scan(&exists).Error; err != nil {
		t.Fatalf("column exists (%s.%s): %v", table, column, err)
	}
	return exists
}

func indexExists(t *testing.T, db *gorm.DB, index string) bool {
	t.Helper()
	var exists bool
	if err := db.Raw(
		"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname=?)",
		index,
	).Scan(&exists).Error; err != nil {
		t.Fatalf("index exists (%s): %v", index, err)
	}
	return exists
}

// TestMigrationsUpCreatesExpectedSchema applies all migrations from scratch and
// verifies every expected table, column, and index is present.
func TestMigrationsUpCreatesExpectedSchema(t *testing.T) {
	db, connStr := rawMigrationDB(t)

	m, err := migrate.New("file://../../migrations", connStr)
	if err != nil {
		t.Fatalf("create migrator: %v", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		t.Fatalf("up: %v", err)
	}

	wantTables := []string{
		"users", "profiles", "tags", "political_views", "food_restrictions",
		"movie_genres", "book_genres", "hangout_places", "quotes", "top_songs",
		"associated_songs", "profile_embeddings",
		"password_reset_tokens", "email_verification_tokens",
	}
	for _, table := range wantTables {
		if !tableExists(t, db, table) {
			t.Errorf("missing table after migrations up: %s", table)
		}
	}

	// Auth overhaul (0004) must have replaced username with email.
	if columnExists(t, db, "users", "username") {
		t.Error("users.username should have been dropped in 0004")
	}
	for _, col := range []string{"email", "email_verified"} {
		if !columnExists(t, db, "users", col) {
			t.Errorf("users.%s missing", col)
		}
	}

	// Key indexes from 0001 / 0002 / 0004.
	wantIndexes := []string{
		"idx_profiles_user_id",
		"idx_profiles_user_relationship",
		"idx_profiles_user_full_name_lower",
		"idx_users_email",
		"idx_email_verification_tokens_token",
		"idx_password_reset_tokens_token",
	}
	for _, idx := range wantIndexes {
		if !indexExists(t, db, idx) {
			t.Errorf("missing index: %s", idx)
		}
	}

	// pgvector extension
	var hasVector bool
	if err := db.Raw("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname='vector')").Scan(&hasVector).Error; err != nil {
		t.Fatalf("check vector extension: %v", err)
	}
	if !hasVector {
		t.Error("pgvector extension not installed after migrations")
	}
}

// TestMigrationsDownIsFullyReversible applies all migrations, then rolls them
// all the way back, then re-applies. This catches migrations that only work
// once or that leak schema across up/down cycles.
func TestMigrationsDownIsFullyReversible(t *testing.T) {
	db, connStr := rawMigrationDB(t)

	m, err := migrate.New("file://../../migrations", connStr)
	if err != nil {
		t.Fatalf("create migrator: %v", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		t.Fatalf("first up: %v", err)
	}
	if err := m.Down(); err != nil && err != migrate.ErrNoChange {
		t.Fatalf("down: %v", err)
	}

	// Down should have dropped every app table (the migrations tracking
	// table created by golang-migrate is allowed to remain).
	for _, table := range []string{
		"users", "profiles", "profile_embeddings",
		"password_reset_tokens", "email_verification_tokens",
	} {
		if tableExists(t, db, table) {
			t.Errorf("%s still present after full down migration", table)
		}
	}

	// Re-apply to ensure up→down→up cycles cleanly.
	// migrate.Migrate is stateful; after Down the instance is at version 0 and
	// Up works again.
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		t.Fatalf("second up: %v", err)
	}
	for _, table := range []string{"users", "profiles", "profile_embeddings"} {
		if !tableExists(t, db, table) {
			t.Errorf("%s missing after down+up cycle", table)
		}
	}
	_, _ = m.Close()
}

// TestMigrationsEnforceProfileCascadeDelete verifies the ON DELETE CASCADE
// constraints declared in the schema actually fire — deleting a profile must
// remove its associations. This is a behavioural check on the schema, not the
// repository.
func TestMigrationsEnforceProfileCascadeDelete(t *testing.T) {
	_, connStr := rawMigrationDB(t)

	m, err := migrate.New("file://../../migrations", connStr)
	if err != nil {
		t.Fatalf("create migrator: %v", err)
	}
	defer m.Close()
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		t.Fatalf("up: %v", err)
	}

	db, err := gorm.Open(gormPostgres.Open(connStr), &gorm.Config{})
	if err != nil {
		t.Fatalf("reopen db: %v", err)
	}

	// Seed: user + profile + one child in each table that uses CASCADE.
	if err := db.Exec("INSERT INTO users (id, email, password) VALUES (1, 'casc@example.com', 'x')").Error; err != nil {
		t.Fatalf("insert user: %v", err)
	}
	if err := db.Exec("INSERT INTO profiles (id, user_id, full_name, relationship_type) VALUES (1, 1, 'Casc', 'Friend')").Error; err != nil {
		t.Fatalf("insert profile: %v", err)
	}
	if err := db.Exec("INSERT INTO tags (profile_id, tag) VALUES (1, 't')").Error; err != nil {
		t.Fatalf("insert tag: %v", err)
	}
	if err := db.Exec("INSERT INTO top_songs (profile_id, name, artist) VALUES (1, 's', 'a')").Error; err != nil {
		t.Fatalf("insert song: %v", err)
	}

	// Delete the profile; tags and songs should be gone.
	if err := db.Exec("DELETE FROM profiles WHERE id = 1").Error; err != nil {
		t.Fatalf("delete profile: %v", err)
	}

	var tagsCount, songsCount int64
	if err := db.Raw("SELECT COUNT(*) FROM tags WHERE profile_id = 1").Scan(&tagsCount).Error; err != nil {
		t.Fatalf("count tags: %v", err)
	}
	if err := db.Raw("SELECT COUNT(*) FROM top_songs WHERE profile_id = 1").Scan(&songsCount).Error; err != nil {
		t.Fatalf("count songs: %v", err)
	}
	if tagsCount != 0 || songsCount != 0 {
		t.Fatalf("cascade delete failed: tags=%d songs=%d", tagsCount, songsCount)
	}

	// Now delete the user; profile must also cascade away.
	if err := db.Exec("INSERT INTO profiles (id, user_id, full_name, relationship_type) VALUES (2, 1, 'Casc2', 'Friend')").Error; err != nil {
		t.Fatalf("reinsert profile: %v", err)
	}
	if err := db.Exec("DELETE FROM users WHERE id = 1").Error; err != nil {
		t.Fatalf("delete user: %v", err)
	}
	var profileCount int64
	if err := db.Raw("SELECT COUNT(*) FROM profiles WHERE user_id = 1").Scan(&profileCount).Error; err != nil {
		t.Fatalf("count profiles: %v", err)
	}
	if profileCount != 0 {
		t.Fatalf("expected user-delete cascade to remove profiles, still have %d", profileCount)
	}
}

// TestMigrationsRejectBadRelationshipType verifies the CHECK constraint on
// profiles.relationship_type catches invalid values at the DB layer — a
// defense-in-depth check that complements service-layer validation.
func TestMigrationsRejectBadRelationshipType(t *testing.T) {
	_, connStr := rawMigrationDB(t)

	m, err := migrate.New("file://../../migrations", connStr)
	if err != nil {
		t.Fatalf("create migrator: %v", err)
	}
	defer m.Close()
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		t.Fatalf("up: %v", err)
	}

	db, err := gorm.Open(gormPostgres.Open(connStr), &gorm.Config{})
	if err != nil {
		t.Fatalf("reopen db: %v", err)
	}

	if err := db.Exec("INSERT INTO users (id, email, password) VALUES (1, 'rt@example.com', 'x')").Error; err != nil {
		t.Fatalf("insert user: %v", err)
	}
	err = db.Exec("INSERT INTO profiles (user_id, full_name, relationship_type) VALUES (1, 'X', 'Stranger')").Error
	if err == nil {
		t.Fatal("expected CHECK constraint to reject invalid relationship_type")
	}
}
