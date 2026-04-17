package integration_test

import (
	"testing"

	"github.com/golang-migrate/migrate/v4"
	"github.com/stretchr/testify/require"
	gormPostgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func rawMigrationDB(t *testing.T) (*gorm.DB, string) {
	t.Helper()
	lockSharedInfra(t, false)
	return createIsolatedTestDatabase(t, false)
}

func tableExists(t *testing.T, db *gorm.DB, table string) bool {
	t.Helper()
	var exists bool
	require.NoError(t, db.Raw(
		"SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=?)",
		table,
	).Scan(&exists).Error)
	return exists
}

func columnExists(t *testing.T, db *gorm.DB, table, column string) bool {
	t.Helper()
	var exists bool
	require.NoError(t, db.Raw(
		"SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=? AND column_name=?)",
		table, column,
	).Scan(&exists).Error)
	return exists
}

func indexExists(t *testing.T, db *gorm.DB, index string) bool {
	t.Helper()
	var exists bool
	require.NoError(t, db.Raw(
		"SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname=?)",
		index,
	).Scan(&exists).Error)
	return exists
}

func TestMigrationsUpCreatesExpectedSchema(t *testing.T) {
	db, connStr := rawMigrationDB(t)

	m, err := migrate.New("file://../../migrations", connStr)
	require.NoError(t, err)
	defer func() {
		_, _ = m.Close()
	}()

	err = m.Up()
	require.True(t, err == nil || err == migrate.ErrNoChange)

	for _, table := range []string{
		"users", "profiles", "tags", "political_views", "food_restrictions",
		"movie_genres", "book_genres", "hangout_places", "quotes", "top_songs",
		"associated_songs", "profile_embeddings", "password_reset_tokens", "email_verification_tokens",
	} {
		require.True(t, tableExists(t, db, table), table)
	}

	require.False(t, columnExists(t, db, "users", "username"))
	for _, col := range []string{"email", "email_verified"} {
		require.True(t, columnExists(t, db, "users", col), col)
	}

	for _, idx := range []string{
		"idx_profiles_user_id",
		"idx_profiles_user_relationship",
		"idx_profiles_user_full_name_lower",
		"idx_users_email",
		"idx_email_verification_tokens_token",
		"idx_password_reset_tokens_token",
	} {
		require.True(t, indexExists(t, db, idx), idx)
	}

	var hasVector bool
	require.NoError(t, db.Raw("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname='vector')").Scan(&hasVector).Error)
	require.True(t, hasVector)
}

func TestMigrationsDownIsFullyReversible(t *testing.T) {
	db, connStr := rawMigrationDB(t)

	m, err := migrate.New("file://../../migrations", connStr)
	require.NoError(t, err)

	err = m.Up()
	require.True(t, err == nil || err == migrate.ErrNoChange)
	err = m.Down()
	require.True(t, err == nil || err == migrate.ErrNoChange)

	for _, table := range []string{
		"users", "profiles", "profile_embeddings", "password_reset_tokens", "email_verification_tokens",
	} {
		require.False(t, tableExists(t, db, table), table)
	}

	err = m.Up()
	require.True(t, err == nil || err == migrate.ErrNoChange)
	for _, table := range []string{"users", "profiles", "profile_embeddings"} {
		require.True(t, tableExists(t, db, table), table)
	}
	_, _ = m.Close()
}

func TestMigrationsEnforceProfileCascadeDelete(t *testing.T) {
	_, connStr := rawMigrationDB(t)

	m, err := migrate.New("file://../../migrations", connStr)
	require.NoError(t, err)
	defer func() {
		_, _ = m.Close()
	}()
	err = m.Up()
	require.True(t, err == nil || err == migrate.ErrNoChange)

	db, err := gorm.Open(gormPostgres.Open(connStr), &gorm.Config{})
	require.NoError(t, err)

	require.NoError(t, db.Exec("INSERT INTO users (id, email, password) VALUES (1, 'casc@example.com', 'x')").Error)
	require.NoError(t, db.Exec("INSERT INTO profiles (id, user_id, full_name, relationship_type) VALUES (1, 1, 'Casc', 'Friend')").Error)
	require.NoError(t, db.Exec("INSERT INTO tags (profile_id, tag) VALUES (1, 't')").Error)
	require.NoError(t, db.Exec("INSERT INTO top_songs (profile_id, name, artist) VALUES (1, 's', 'a')").Error)
	require.NoError(t, db.Exec("DELETE FROM profiles WHERE id = 1").Error)

	var tagsCount, songsCount int64
	require.NoError(t, db.Raw("SELECT COUNT(*) FROM tags WHERE profile_id = 1").Scan(&tagsCount).Error)
	require.NoError(t, db.Raw("SELECT COUNT(*) FROM top_songs WHERE profile_id = 1").Scan(&songsCount).Error)
	require.Zero(t, tagsCount)
	require.Zero(t, songsCount)

	require.NoError(t, db.Exec("INSERT INTO profiles (id, user_id, full_name, relationship_type) VALUES (2, 1, 'Casc2', 'Friend')").Error)
	require.NoError(t, db.Exec("DELETE FROM users WHERE id = 1").Error)

	var profileCount int64
	require.NoError(t, db.Raw("SELECT COUNT(*) FROM profiles WHERE user_id = 1").Scan(&profileCount).Error)
	require.Zero(t, profileCount)
}

func TestMigrationsRejectBadRelationshipType(t *testing.T) {
	_, connStr := rawMigrationDB(t)

	m, err := migrate.New("file://../../migrations", connStr)
	require.NoError(t, err)
	defer func() {
		_, _ = m.Close()
	}()
	err = m.Up()
	require.True(t, err == nil || err == migrate.ErrNoChange)

	db, err := gorm.Open(gormPostgres.Open(connStr), &gorm.Config{})
	require.NoError(t, err)

	require.NoError(t, db.Exec("INSERT INTO users (id, email, password) VALUES (1, 'rt@example.com', 'x')").Error)
	err = db.Exec("INSERT INTO profiles (user_id, full_name, relationship_type) VALUES (1, 'X', 'Stranger')").Error
	require.Error(t, err)
}
