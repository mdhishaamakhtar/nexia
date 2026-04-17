package integration_test

import (
	"testing"

	"nexia-backend/internal/models"
	"nexia-backend/internal/repositories"

	"github.com/stretchr/testify/require"
)

func TestProfileRepositoryPruneAllAssociationTypes(t *testing.T) {
	db := buildDB(t)
	users := repositories.NewUserRepository(db)
	profiles := repositories.NewProfileRepository(db)

	require.NoError(t, users.Create(&models.User{Email: "prune@example.com", Password: "x"}))
	user, err := users.FindByEmail("prune@example.com")
	require.NoError(t, err)

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
	require.NoError(t, profiles.Create(initial))

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

	require.NoError(t, profiles.Update(updated))

	reloaded, err := profiles.FindByID(initial.ID, user.ID)
	require.NoError(t, err)
	require.Len(t, reloaded.Tags, 2)
	require.Len(t, reloaded.PoliticalViews, 1)
	require.Len(t, reloaded.FoodRestrictions, 1)
	require.Equal(t, "all-new", reloaded.FoodRestrictions[0].Restriction)
	require.Empty(t, reloaded.MovieGenres)
	require.Len(t, reloaded.BookGenres, 1)
	require.Len(t, reloaded.HangoutPlaces, 2)
	require.Empty(t, reloaded.Quotes)
	require.Len(t, reloaded.TopSongs, 1)
	require.Nil(t, reloaded.AssociatedSong)
}

func TestProfileRepositoryFindByIDOwnershipGuard(t *testing.T) {
	db := buildDB(t)
	users := repositories.NewUserRepository(db)
	profiles := repositories.NewProfileRepository(db)

	for _, email := range []string{"owner@example.com", "other@example.com"} {
		require.NoError(t, users.Create(&models.User{Email: email, Password: "x"}))
	}
	owner, err := users.FindByEmail("owner@example.com")
	require.NoError(t, err)
	other, err := users.FindByEmail("other@example.com")
	require.NoError(t, err)

	p := &models.Profile{UserID: owner.ID, FullName: "Owned", RelationshipType: "Friend"}
	require.NoError(t, profiles.Create(p))

	_, err = profiles.FindByID(p.ID, owner.ID)
	require.NoError(t, err)

	_, err = profiles.FindByID(p.ID, other.ID)
	require.Error(t, err)

	require.NoError(t, profiles.Delete(p.ID, other.ID))

	_, err = profiles.FindByID(p.ID, owner.ID)
	require.NoError(t, err)
}
