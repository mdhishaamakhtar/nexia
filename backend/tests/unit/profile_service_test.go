package unit_test

import (
	"errors"
	"testing"
	"time"

	"nexia-backend/internal/models"
	"nexia-backend/internal/services"
)

type fakeProfileRepo struct {
	created *models.Profile
	updated *models.Profile
	deleted struct {
		id     uint64
		userID uint64
	}
	findByIDResp *models.Profile
	findAllResp  []models.Profile
	findAllTotal int64
	err          error
}

func (f *fakeProfileRepo) Create(profile *models.Profile) error {
	if f.err != nil {
		return f.err
	}
	profile.ID = 100
	f.created = profile
	return nil
}

func (f *fakeProfileRepo) FindByID(id uint64, userID uint64) (*models.Profile, error) {
	if f.err != nil {
		return nil, f.err
	}
	if f.findByIDResp == nil {
		return nil, errors.New("not found")
	}
	return f.findByIDResp, nil
}

func (f *fakeProfileRepo) FindAll(page, limit int, search string, relationshipType string, userID uint64) ([]models.Profile, int64, error) {
	if f.err != nil {
		return nil, 0, f.err
	}
	return f.findAllResp, f.findAllTotal, nil
}

func (f *fakeProfileRepo) Update(profile *models.Profile) error {
	if f.err != nil {
		return f.err
	}
	f.updated = profile
	return nil
}

func (f *fakeProfileRepo) Delete(id uint64, userID uint64) error {
	if f.err != nil {
		return f.err
	}
	f.deleted.id = id
	f.deleted.userID = userID
	return nil
}

type fakeEmbeddingQueue struct {
	embedded []uint
	deleted  []uint64
	err      error
}

func (f *fakeEmbeddingQueue) EnqueueEmbeddingTask(profileID uint) error {
	f.embedded = append(f.embedded, profileID)
	return f.err
}

func (f *fakeEmbeddingQueue) EnqueueDeletionTask(profileID uint64) error {
	f.deleted = append(f.deleted, profileID)
	return f.err
}

func TestProfileServiceCreateProfile(t *testing.T) {
	repo := &fakeProfileRepo{}
	queue := &fakeEmbeddingQueue{}
	svc := services.NewProfileService(repo, queue)

	birthday := models.Date(time.Date(2001, time.March, 22, 0, 0, 0, 0, time.UTC))
	profile := &models.Profile{FullName: "Alice", TopSongs: []models.TopSong{{Name: "Song", Artist: "Artist"}}, Birthday: &birthday}

	if err := svc.CreateProfile(profile, 77); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if profile.UserID != 77 {
		t.Fatalf("expected user id 77, got %d", profile.UserID)
	}
	if profile.ZodiacSign != models.ZodiacAries {
		t.Fatalf("expected Aries, got %s", profile.ZodiacSign)
	}
	if len(queue.embedded) != 1 || queue.embedded[0] != uint(profile.ID) {
		t.Fatalf("expected enqueue for profile id %d", profile.ID)
	}
}

func TestProfileServiceCreateValidation(t *testing.T) {
	svc := services.NewProfileService(&fakeProfileRepo{}, &fakeEmbeddingQueue{})
	profile := &models.Profile{TopSongs: []models.TopSong{{}, {}, {}, {}}}

	err := svc.CreateProfile(profile, 1)
	if !errors.Is(err, services.ErrValidation) {
		t.Fatalf("expected ErrValidation, got %v", err)
	}
}

func TestProfileServiceListProfilesBounds(t *testing.T) {
	repo := &fakeProfileRepo{findAllResp: []models.Profile{{ID: 1}}, findAllTotal: 1}
	svc := services.NewProfileService(repo, nil)

	profiles, total, err := svc.ListProfiles(0, 500, "", "", 1)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(profiles) != 1 || total != 1 {
		t.Fatalf("unexpected list result")
	}
}

func TestProfileServiceUpdateAndDelete(t *testing.T) {
	repo := &fakeProfileRepo{}
	queue := &fakeEmbeddingQueue{}
	svc := services.NewProfileService(repo, queue)

	p := &models.Profile{FullName: "Bob", TopSongs: []models.TopSong{{Name: "Song", Artist: "A"}}}
	if err := svc.UpdateProfile(10, p, 3); err != nil {
		t.Fatalf("unexpected update error: %v", err)
	}
	if repo.updated == nil || repo.updated.ID != 10 || repo.updated.UserID != 3 {
		t.Fatalf("update did not set id/user correctly")
	}
	if len(queue.embedded) != 1 || queue.embedded[0] != 10 {
		t.Fatalf("expected queue update enqueue")
	}

	if err := svc.DeleteProfile(10, 3); err != nil {
		t.Fatalf("unexpected delete error: %v", err)
	}
	if repo.deleted.id != 10 || repo.deleted.userID != 3 {
		t.Fatalf("delete repo args mismatch")
	}
	if len(queue.deleted) != 1 || queue.deleted[0] != 10 {
		t.Fatalf("expected queue delete enqueue")
	}
}

func TestProfileServiceRepositoryAndQueueErrorPaths(t *testing.T) {
	repoErr := errors.New("repo failed")
	repo := &fakeProfileRepo{err: repoErr}
	svc := services.NewProfileService(repo, &fakeEmbeddingQueue{err: errors.New("queue failed")})

	if err := svc.CreateProfile(&models.Profile{TopSongs: []models.TopSong{{Name: "a", Artist: "b"}}}, 1); !errors.Is(err, repoErr) {
		t.Fatalf("expected repo error on create, got %v", err)
	}
	if err := svc.UpdateProfile(1, &models.Profile{TopSongs: []models.TopSong{{Name: "a", Artist: "b"}}}, 1); !errors.Is(err, repoErr) {
		t.Fatalf("expected repo error on update, got %v", err)
	}
	if err := svc.DeleteProfile(1, 1); !errors.Is(err, repoErr) {
		t.Fatalf("expected repo error on delete, got %v", err)
	}
}

func TestDeriveZodiacBoundaries(t *testing.T) {
	tests := []struct {
		name     string
		date     time.Time
		expected models.ZodiacSign
	}{
		{name: "January Capricorn", date: time.Date(2024, time.January, 1, 0, 0, 0, 0, time.UTC), expected: models.ZodiacCapricorn},
		{name: "Aries starts", date: time.Date(2024, time.March, 21, 0, 0, 0, 0, time.UTC), expected: models.ZodiacAries},
		{name: "April Taurus", date: time.Date(2024, time.April, 21, 0, 0, 0, 0, time.UTC), expected: models.ZodiacTaurus},
		{name: "May Gemini", date: time.Date(2024, time.May, 22, 0, 0, 0, 0, time.UTC), expected: models.ZodiacGemini},
		{name: "June Cancer", date: time.Date(2024, time.June, 22, 0, 0, 0, 0, time.UTC), expected: models.ZodiacCancer},
		{name: "July Leo", date: time.Date(2024, time.July, 24, 0, 0, 0, 0, time.UTC), expected: models.ZodiacLeo},
		{name: "August Virgo", date: time.Date(2024, time.August, 24, 0, 0, 0, 0, time.UTC), expected: models.ZodiacVirgo},
		{name: "September Libra", date: time.Date(2024, time.September, 24, 0, 0, 0, 0, time.UTC), expected: models.ZodiacLibra},
		{name: "October Scorpio", date: time.Date(2024, time.October, 24, 0, 0, 0, 0, time.UTC), expected: models.ZodiacScorpio},
		{name: "November Sagittarius", date: time.Date(2024, time.November, 23, 0, 0, 0, 0, time.UTC), expected: models.ZodiacSagittarius},
		{name: "December Capricorn", date: time.Date(2024, time.December, 22, 0, 0, 0, 0, time.UTC), expected: models.ZodiacCapricorn},
		{name: "Pisces ends", date: time.Date(2024, time.March, 20, 0, 0, 0, 0, time.UTC), expected: models.ZodiacPisces},
		{name: "Capricorn starts", date: time.Date(2024, time.December, 22, 0, 0, 0, 0, time.UTC), expected: models.ZodiacCapricorn},
		{name: "Aquarius starts", date: time.Date(2024, time.January, 20, 0, 0, 0, 0, time.UTC), expected: models.ZodiacAquarius},
		{name: "February Pisces", date: time.Date(2024, time.February, 20, 0, 0, 0, 0, time.UTC), expected: models.ZodiacPisces},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := services.DeriveZodiac(tt.date)
			if got != tt.expected {
				t.Fatalf("expected %s, got %s", tt.expected, got)
			}
		})
	}
}
