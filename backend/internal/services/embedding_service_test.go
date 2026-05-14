package services_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"nexia-backend/internal/models"
	"nexia-backend/internal/services"

	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

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

func newEmbeddingSvc(profiles *embeddingFakeProfileRepo, gen services.EmbeddingGenerator, repo services.EmbeddingRepository) *services.EmbeddingService {
	return services.NewEmbeddingService(profiles, gen, repo, zap.NewNop())
}

func TestEmbedProfileSuccess(t *testing.T) {
	ctrl := gomock.NewController(t)
	gen := NewMockEmbeddingGenerator(ctrl)
	repo := NewMockEmbeddingRepository(ctrl)

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
		Notes:            "Met at a hackathon",
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

	var generatedText string
	embedding := []float32{0.1, 0.2}
	gen.EXPECT().
		GenerateEmbedding(gomock.Any(), gomock.Any()).
		DoAndReturn(func(_ context.Context, text string) ([]float32, error) {
			generatedText = text
			return embedding, nil
		})
	repo.EXPECT().UpsertProfile(gomock.Any(), profile, embedding).Return(nil)

	svc := newEmbeddingSvc(&embeddingFakeProfileRepo{profile: profile}, gen, repo)
	require.NoError(t, svc.EmbedProfile(context.Background(), 7))

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
		"Notes: Met at a hackathon",
	} {
		require.True(t, strings.Contains(generatedText, want))
	}
}

func TestEmbedProfileNotFound(t *testing.T) {
	ctrl := gomock.NewController(t)
	svc := newEmbeddingSvc(&embeddingFakeProfileRepo{loadErr: gorm.ErrRecordNotFound}, NewMockEmbeddingGenerator(ctrl), NewMockEmbeddingRepository(ctrl))

	err := svc.EmbedProfile(context.Background(), 1)
	require.ErrorIs(t, err, services.ErrNotFound)
}

func TestEmbedProfileLoadError(t *testing.T) {
	ctrl := gomock.NewController(t)
	svc := newEmbeddingSvc(&embeddingFakeProfileRepo{loadErr: errors.New("db connection lost")}, NewMockEmbeddingGenerator(ctrl), NewMockEmbeddingRepository(ctrl))

	err := svc.EmbedProfile(context.Background(), 1)
	require.Error(t, err)
	require.False(t, errors.Is(err, services.ErrNotFound))
}

func TestEmbedProfileGenerationError(t *testing.T) {
	ctrl := gomock.NewController(t)
	gen := NewMockEmbeddingGenerator(ctrl)
	repo := NewMockEmbeddingRepository(ctrl)

	gen.EXPECT().GenerateEmbedding(gomock.Any(), gomock.Any()).Return(nil, errors.New("gemini unavailable"))

	svc := newEmbeddingSvc(&embeddingFakeProfileRepo{profile: &models.Profile{ID: 1, FullName: "Bob"}}, gen, repo)
	require.Error(t, svc.EmbedProfile(context.Background(), 1))
}

func TestEmbedProfileUpsertError(t *testing.T) {
	ctrl := gomock.NewController(t)
	gen := NewMockEmbeddingGenerator(ctrl)
	repo := NewMockEmbeddingRepository(ctrl)

	profile := &models.Profile{ID: 1, FullName: "Bob"}
	embedding := []float32{0.1, 0.2}
	gen.EXPECT().GenerateEmbedding(gomock.Any(), gomock.Any()).Return(embedding, nil)
	repo.EXPECT().UpsertProfile(gomock.Any(), profile, embedding).Return(errors.New("pgvector unavailable"))

	svc := newEmbeddingSvc(&embeddingFakeProfileRepo{profile: profile}, gen, repo)
	require.Error(t, svc.EmbedProfile(context.Background(), 1))
}

func TestDeleteEmbeddingSuccess(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := NewMockEmbeddingRepository(ctrl)
	repo.EXPECT().DeleteProfile(gomock.Any(), uint64(42)).Return(nil)

	svc := newEmbeddingSvc(&embeddingFakeProfileRepo{}, NewMockEmbeddingGenerator(ctrl), repo)
	require.NoError(t, svc.DeleteEmbedding(context.Background(), 42))
}

func TestDeleteEmbeddingError(t *testing.T) {
	ctrl := gomock.NewController(t)
	repo := NewMockEmbeddingRepository(ctrl)
	repo.EXPECT().DeleteProfile(gomock.Any(), uint64(1)).Return(errors.New("store unavailable"))

	svc := newEmbeddingSvc(&embeddingFakeProfileRepo{}, NewMockEmbeddingGenerator(ctrl), repo)
	require.Error(t, svc.DeleteEmbedding(context.Background(), 1))
}
