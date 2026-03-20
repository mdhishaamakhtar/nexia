package services_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"nexia-backend/internal/models"
	"nexia-backend/internal/services"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// embeddingFakeProfileRepo implements services.ProfileRepository minimally for embedding tests.
type embeddingFakeProfileRepo struct {
	profile *models.Profile
	loadErr error
}

func (f *embeddingFakeProfileRepo) Create(_ *models.Profile) error { return nil }
func (f *embeddingFakeProfileRepo) FindByID(_ uint64, _ uint64) (*models.Profile, error) {
	return nil, nil
}
func (f *embeddingFakeProfileRepo) FindAll(_ int, _ int, _ string, _ string, _ uint64) ([]models.Profile, int64, error) {
	return nil, 0, nil
}
func (f *embeddingFakeProfileRepo) Update(_ *models.Profile) error  { return nil }
func (f *embeddingFakeProfileRepo) Delete(_ uint64, _ uint64) error { return nil }
func (f *embeddingFakeProfileRepo) LoadForEmbedding(_ context.Context, _ uint) (*models.Profile, error) {
	return f.profile, f.loadErr
}

type fakeEmbeddingGenerator struct {
	text string
	err  error
}

func (f *fakeEmbeddingGenerator) GenerateEmbedding(_ context.Context, text string) ([]float32, error) {
	f.text = text
	if f.err != nil {
		return nil, f.err
	}
	return []float32{0.1, 0.2}, nil
}

type fakeEmbeddingRepo struct {
	upsertedProfile *models.Profile
	deletedID       uint64
	upsertErr       error
	deleteErr       error
}

func (f *fakeEmbeddingRepo) UpsertProfile(_ context.Context, profile *models.Profile, _ []float32) error {
	f.upsertedProfile = profile
	return f.upsertErr
}

func (f *fakeEmbeddingRepo) DeleteProfile(_ context.Context, profileID uint64) error {
	f.deletedID = profileID
	return f.deleteErr
}

func newEmbeddingSvc(profiles *embeddingFakeProfileRepo, gen *fakeEmbeddingGenerator, repo *fakeEmbeddingRepo) *services.EmbeddingService {
	return services.NewEmbeddingService(profiles, gen, repo, zap.NewNop())
}

func TestEmbedProfileSuccess(t *testing.T) {
	birthday := models.Date(time.Date(2000, time.March, 21, 0, 0, 0, 0, time.UTC))
	profile := &models.Profile{
		ID:               7,
		UserID:           9,
		FullName:         "Alice Example",
		Bio:              "A close friend",
		Profession:       "Engineer",
		RelationshipType: "Friend",
		Birthday:         &birthday,
		LongTermGoals:    "Build a startup",
		MusicPreference:  "Rock",
		FavoriteMovie:    "Inception",
		FavoriteBook:     "Dune",
		FavoriteMemory:   "Road trip",
		Tags:             []models.Tag{{Tag: "travel"}},
		PoliticalViews:   []models.PoliticalView{{View: "Moderate"}},
		FoodRestrictions: []models.FoodRestriction{{Restriction: "None"}},
		MovieGenres:      []models.MovieGenre{{Genre: "Sci-Fi"}},
		BookGenres:       []models.BookGenre{{Genre: "Fantasy"}},
		HangoutPlaces:    []models.HangoutPlace{{Place: "Cafe"}},
		Quotes:           []models.Quote{{Quote: "Keep going"}},
		TopSongs:         []models.TopSong{{Name: "Song A", Artist: "Artist A"}},
		AssociatedSong:   &models.AssociatedSong{Name: "Song B", Artist: "Artist B"},
	}

	profiles := &embeddingFakeProfileRepo{profile: profile}
	gen := &fakeEmbeddingGenerator{}
	repo := &fakeEmbeddingRepo{}
	svc := newEmbeddingSvc(profiles, gen, repo)

	if err := svc.EmbedProfile(context.Background(), 7); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.upsertedProfile != profile {
		t.Fatalf("expected profile to be upserted")
	}
	for _, want := range []string{
		"Profile of Alice Example",
		"Political Views: Moderate",
		"Food Restrictions: None",
		"Favorite Movie Genres: Sci-Fi",
		"Favorite Book Genres: Fantasy",
		"Favorite Hangout Places: Cafe",
		"Associated Song: Song B by Artist B",
		"Top Songs: Song A by Artist A",
		`"Keep going"`,
	} {
		if !strings.Contains(gen.text, want) {
			t.Fatalf("expected embedding text to contain %q", want)
		}
	}
}

func TestEmbedProfileNotFound(t *testing.T) {
	svc := newEmbeddingSvc(&embeddingFakeProfileRepo{loadErr: gorm.ErrRecordNotFound}, &fakeEmbeddingGenerator{}, &fakeEmbeddingRepo{})

	err := svc.EmbedProfile(context.Background(), 1)
	if !errors.Is(err, services.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestEmbedProfileLoadError(t *testing.T) {
	svc := newEmbeddingSvc(&embeddingFakeProfileRepo{loadErr: errors.New("db connection lost")}, &fakeEmbeddingGenerator{}, &fakeEmbeddingRepo{})

	err := svc.EmbedProfile(context.Background(), 1)
	if err == nil || errors.Is(err, services.ErrNotFound) {
		t.Fatalf("expected wrapped load error, got %v", err)
	}
}

func TestEmbedProfileGenerationError(t *testing.T) {
	gen := &fakeEmbeddingGenerator{err: errors.New("gemini unavailable")}
	svc := newEmbeddingSvc(&embeddingFakeProfileRepo{profile: &models.Profile{ID: 1, FullName: "Bob"}}, gen, &fakeEmbeddingRepo{})

	if err := svc.EmbedProfile(context.Background(), 1); err == nil {
		t.Fatal("expected generation error")
	}
}

func TestEmbedProfileUpsertError(t *testing.T) {
	repo := &fakeEmbeddingRepo{upsertErr: errors.New("pgvector unavailable")}
	svc := newEmbeddingSvc(&embeddingFakeProfileRepo{profile: &models.Profile{ID: 1, FullName: "Bob"}}, &fakeEmbeddingGenerator{}, repo)

	if err := svc.EmbedProfile(context.Background(), 1); err == nil {
		t.Fatal("expected upsert error")
	}
}

func TestDeleteEmbeddingSuccess(t *testing.T) {
	repo := &fakeEmbeddingRepo{}
	svc := newEmbeddingSvc(&embeddingFakeProfileRepo{}, &fakeEmbeddingGenerator{}, repo)

	if err := svc.DeleteEmbedding(context.Background(), 42); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.deletedID != 42 {
		t.Fatalf("expected delete for id 42, got %d", repo.deletedID)
	}
}

func TestDeleteEmbeddingError(t *testing.T) {
	repo := &fakeEmbeddingRepo{deleteErr: errors.New("store unavailable")}
	svc := newEmbeddingSvc(&embeddingFakeProfileRepo{}, &fakeEmbeddingGenerator{}, repo)

	if err := svc.DeleteEmbedding(context.Background(), 1); err == nil {
		t.Fatal("expected delete error to propagate")
	}
}
