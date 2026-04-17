package integration_test

import (
	"testing"

	"nexia-backend/internal/models"
	"nexia-backend/internal/repositories"
)

// TestProfileRepositoryPruneAllAssociationTypes drives the repository directly
// through an update that removes, adds, and mutates items across every
// has-many association simultaneously. This covers branches in
// pruneStaleAssociations that the HTTP-level CRUD test only touches for Tags.
func TestProfileRepositoryPruneAllAssociationTypes(t *testing.T) {
	db := buildDB(t)
	users := repositories.NewUserRepository(db)
	profiles := repositories.NewProfileRepository(db)

	if err := users.Create(&models.User{Email: "prune@example.com", Password: "x"}); err != nil {
		t.Fatalf("user: %v", err)
	}
	user, _ := users.FindByEmail("prune@example.com")

	initial := &models.Profile{
		UserID:           user.ID,
		FullName:         "Prune Test",
		RelationshipType: "Friend",
		Tags:             []models.Tag{{Tag: "a"}, {Tag: "b"}, {Tag: "c"}},
		PoliticalViews:   []models.PoliticalView{{View: "p1"}, {View: "p2"}},
		FoodRestrictions: []models.FoodRestriction{{Restriction: "none"}, {Restriction: "nuts"}},
		MovieGenres:      []models.MovieGenre{{Genre: "scifi"}, {Genre: "drama"}},
		BookGenres:       []models.BookGenre{{Genre: "fantasy"}, {Genre: "thriller"}},
		HangoutPlaces:    []models.HangoutPlace{{Place: "cafe"}, {Place: "park"}},
		Quotes:           []models.Quote{{Quote: "one"}, {Quote: "two"}},
		TopSongs:         []models.TopSong{{Name: "s1", Artist: "a1"}, {Name: "s2", Artist: "a2"}},
		AssociatedSong:   &models.AssociatedSong{Name: "anthem", Artist: "band"},
	}
	if err := profiles.Create(initial); err != nil {
		t.Fatalf("create: %v", err)
	}

	// Update: keep one from each, add a new one, remove the rest, and clear
	// the AssociatedSong (has-one → nil).
	updated := &models.Profile{
		ID:               initial.ID,
		UserID:           user.ID,
		FullName:         "Prune Test",
		RelationshipType: "Friend",
		Tags:             []models.Tag{{ID: initial.Tags[0].ID, Tag: "a"}, {Tag: "fresh"}},
		PoliticalViews:   []models.PoliticalView{{ID: initial.PoliticalViews[0].ID, View: "p1"}},
		FoodRestrictions: []models.FoodRestriction{{Restriction: "all-new"}},
		MovieGenres:      nil,
		BookGenres:       []models.BookGenre{{ID: initial.BookGenres[1].ID, Genre: "thriller"}},
		HangoutPlaces:    []models.HangoutPlace{{Place: "beach"}, {Place: "home"}},
		Quotes:           []models.Quote{},
		TopSongs:         []models.TopSong{{Name: "only", Artist: "me"}},
		AssociatedSong:   nil,
	}

	if err := profiles.Update(updated); err != nil {
		t.Fatalf("update: %v", err)
	}

	reloaded, err := profiles.FindByID(initial.ID, user.ID)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}

	if len(reloaded.Tags) != 2 {
		t.Fatalf("tags: expected 2, got %d", len(reloaded.Tags))
	}
	if len(reloaded.PoliticalViews) != 1 {
		t.Fatalf("political_views: expected 1, got %d", len(reloaded.PoliticalViews))
	}
	if len(reloaded.FoodRestrictions) != 1 || reloaded.FoodRestrictions[0].Restriction != "all-new" {
		t.Fatalf("food_restrictions wrong: %+v", reloaded.FoodRestrictions)
	}
	if len(reloaded.MovieGenres) != 0 {
		t.Fatalf("movie_genres: expected 0 after nil update, got %d", len(reloaded.MovieGenres))
	}
	if len(reloaded.BookGenres) != 1 {
		t.Fatalf("book_genres: expected 1, got %d", len(reloaded.BookGenres))
	}
	if len(reloaded.HangoutPlaces) != 2 {
		t.Fatalf("hangout_places: expected 2, got %d", len(reloaded.HangoutPlaces))
	}
	if len(reloaded.Quotes) != 0 {
		t.Fatalf("quotes: expected 0, got %d", len(reloaded.Quotes))
	}
	if len(reloaded.TopSongs) != 1 {
		t.Fatalf("top_songs: expected 1, got %d", len(reloaded.TopSongs))
	}
	if reloaded.AssociatedSong != nil {
		t.Fatalf("associated_song: expected nil after update, got %+v", reloaded.AssociatedSong)
	}
}

// TestProfileRepositoryFindByIDOwnershipGuard pins the behavior that FindByID
// won't leak profiles across users — complementing the authorization tests at
// the HTTP level.
func TestProfileRepositoryFindByIDOwnershipGuard(t *testing.T) {
	db := buildDB(t)
	users := repositories.NewUserRepository(db)
	profiles := repositories.NewProfileRepository(db)

	for _, email := range []string{"owner@example.com", "other@example.com"} {
		if err := users.Create(&models.User{Email: email, Password: "x"}); err != nil {
			t.Fatalf("create user %s: %v", email, err)
		}
	}
	owner, _ := users.FindByEmail("owner@example.com")
	other, _ := users.FindByEmail("other@example.com")

	p := &models.Profile{UserID: owner.ID, FullName: "Owned", RelationshipType: "Friend"}
	if err := profiles.Create(p); err != nil {
		t.Fatalf("create profile: %v", err)
	}

	if _, err := profiles.FindByID(p.ID, owner.ID); err != nil {
		t.Fatalf("owner should be able to fetch: %v", err)
	}
	if _, err := profiles.FindByID(p.ID, other.ID); err == nil {
		t.Fatal("other user should NOT be able to fetch by profile id")
	}

	// Delete scoped to wrong user must be a no-op.
	if err := profiles.Delete(p.ID, other.ID); err != nil {
		t.Fatalf("delete by other user returned error: %v (expected silent no-op)", err)
	}
	if _, err := profiles.FindByID(p.ID, owner.ID); err != nil {
		t.Fatal("owner's profile was deleted by foreign user — authorization leak")
	}
}
