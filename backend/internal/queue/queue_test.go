package queue

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"

	"nexia-backend/internal/ai"
	"nexia-backend/internal/models"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type fakeEnqueuer struct {
	tasks  []*asynq.Task
	err    error
	closed bool
}

func (f *fakeEnqueuer) Enqueue(task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error) {
	f.tasks = append(f.tasks, task)
	if f.err != nil {
		return nil, f.err
	}
	return &asynq.TaskInfo{ID: "task"}, nil
}

func (f *fakeEnqueuer) Close() error {
	f.closed = true
	return nil
}

type fakeEmbeddingGenerator struct {
	text string
	err  error
}

func (f *fakeEmbeddingGenerator) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	f.text = text
	if f.err != nil {
		return nil, f.err
	}
	return []float32{0.1, 0.2}, nil
}

type fakeVectorStore struct {
	profile   *models.Profile
	embedding []float32
	upsertErr error
	deleteID  uint64
	deleteErr error
}

func (f *fakeVectorStore) UpsertProfile(ctx context.Context, profile *models.Profile, embedding []float32) error {
	f.profile = profile
	f.embedding = embedding
	return f.upsertErr
}

func (f *fakeVectorStore) DeleteProfile(ctx context.Context, profileID uint64) error {
	f.deleteID = profileID
	return f.deleteErr
}

func TestParseRedisOpt(t *testing.T) {
	if got := ParseRedisOpt("redis://localhost:6379/0"); got == nil {
		t.Fatal("expected parsed redis opt")
	}
	if got := ParseRedisOpt("localhost:6379"); got == nil {
		t.Fatal("expected fallback redis opt")
	}
}

func TestQueueClientEnqueueAndClose(t *testing.T) {
	fake := &fakeEnqueuer{}
	client := newQueueClientWithClient(fake, zap.NewNop())

	if err := client.EnqueueEmbeddingTask(7); err != nil {
		t.Fatalf("EnqueueEmbeddingTask returned error: %v", err)
	}
	if err := client.EnqueueDeletionTask(11); err != nil {
		t.Fatalf("EnqueueDeletionTask returned error: %v", err)
	}
	if len(fake.tasks) != 2 {
		t.Fatalf("expected 2 tasks, got %d", len(fake.tasks))
	}

	var embeddingPayload EmbeddingPayload
	if err := json.Unmarshal(fake.tasks[0].Payload(), &embeddingPayload); err != nil {
		t.Fatalf("unmarshal embedding payload: %v", err)
	}
	if embeddingPayload.ProfileID != 7 {
		t.Fatalf("unexpected embedding payload %+v", embeddingPayload)
	}

	var deletionPayload DeletionPayload
	if err := json.Unmarshal(fake.tasks[1].Payload(), &deletionPayload); err != nil {
		t.Fatalf("unmarshal deletion payload: %v", err)
	}
	if deletionPayload.ProfileID != 11 {
		t.Fatalf("unexpected deletion payload %+v", deletionPayload)
	}

	client.Close()
	if !fake.closed {
		t.Fatal("expected client close")
	}
}

func TestNewQueueClient(t *testing.T) {
	old := newAsynqClient
	defer func() { newAsynqClient = old }()

	fake := &fakeEnqueuer{}
	newAsynqClient = func(opt asynq.RedisConnOpt) asynqEnqueuer {
		return fake
	}

	client := NewQueueClient("redis://localhost:6379/0", zap.NewNop())
	if client == nil {
		t.Fatal("expected queue client")
	}
	if client.client != fake {
		t.Fatal("expected injected asynq client")
	}
}

func TestNewTaskHandler(t *testing.T) {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	for _, stmt := range []string{
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
			created_at DATETIME,
			updated_at DATETIME
		)`,
		`CREATE TABLE tags (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER, tag TEXT)`,
		`CREATE TABLE political_views (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER, view TEXT)`,
		`CREATE TABLE food_restrictions (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER, restriction TEXT)`,
		`CREATE TABLE movie_genres (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER, genre TEXT)`,
		`CREATE TABLE book_genres (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER, genre TEXT)`,
		`CREATE TABLE hangout_places (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER, place TEXT)`,
		`CREATE TABLE quotes (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER, quote TEXT)`,
		`CREATE TABLE top_songs (id INTEGER PRIMARY KEY AUTOINCREMENT, profile_id INTEGER, name TEXT, artist TEXT)`,
		`CREATE TABLE associated_songs (profile_id INTEGER PRIMARY KEY, name TEXT, artist TEXT)`,
	} {
		if err := db.Exec(stmt).Error; err != nil {
			t.Fatalf("create schema: %v", err)
		}
	}

	profile := &models.Profile{ID: 3, UserID: 4, FullName: "Loader"}
	if err := db.Create(profile).Error; err != nil {
		t.Fatalf("create profile: %v", err)
	}

	handler := NewTaskHandler(db, &ai.GeminiClient{}, &ai.PgVectorClient{}, zap.NewNop())
	if handler == nil || handler.gemini == nil || handler.pgvector == nil || handler.loadProfile == nil {
		t.Fatalf("expected initialized task handler, got %+v", handler)
	}
	loaded, err := handler.loadProfile(context.Background(), uint(profile.ID))
	if err != nil {
		t.Fatalf("loadProfile returned error: %v", err)
	}
	if loaded.ID != profile.ID || loaded.FullName != "Loader" {
		t.Fatalf("unexpected loaded profile %+v", loaded)
	}
}

func TestTaskHandlerEmbeddingTask(t *testing.T) {
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

	gemini := &fakeEmbeddingGenerator{}
	vector := &fakeVectorStore{}
	handler := &TaskHandler{
		gemini:   gemini,
		pgvector: vector,
		logger:   zap.NewNop(),
		loadProfile: func(ctx context.Context, profileID uint) (*models.Profile, error) {
			return profile, nil
		},
	}

	payload, _ := json.Marshal(EmbeddingPayload{ProfileID: 7})
	if err := handler.HandleEmbeddingTask(context.Background(), asynq.NewTask(TypeEmbeddingTask, payload)); err != nil {
		t.Fatalf("HandleEmbeddingTask returned error: %v", err)
	}
	if vector.profile != profile || len(vector.embedding) != 2 {
		t.Fatalf("unexpected vector upsert args profile=%+v embedding=%+v", vector.profile, vector.embedding)
	}
	for _, want := range []string{
		"Profile of Alice Example",
		"Political Views: Moderate",
		"Food Restrictions: None",
		"Favorite Movie Genres: Sci-Fi",
		"Favorite Book Genres: Fantasy",
		"Favorite Hangout Places: Cafe",
		"Associated Song: Song B by Artist B",
	} {
		if !strings.Contains(gemini.text, want) {
			t.Fatalf("expected embedded text to contain %q, got %q", want, gemini.text)
		}
	}
}

func TestTaskHandlerEmbeddingTaskErrors(t *testing.T) {
	t.Run("invalid payload skips retry", func(t *testing.T) {
		handler := &TaskHandler{logger: zap.NewNop()}
		err := handler.HandleEmbeddingTask(context.Background(), asynq.NewTask(TypeEmbeddingTask, []byte("bad")))
		if !errors.Is(err, asynq.SkipRetry) {
			t.Fatalf("expected skip retry error, got %v", err)
		}
	})

	t.Run("profile not found skips retry", func(t *testing.T) {
		handler := &TaskHandler{
			logger: zap.NewNop(),
			loadProfile: func(ctx context.Context, profileID uint) (*models.Profile, error) {
				return nil, gorm.ErrRecordNotFound
			},
		}
		payload, _ := json.Marshal(EmbeddingPayload{ProfileID: 1})
		err := handler.HandleEmbeddingTask(context.Background(), asynq.NewTask(TypeEmbeddingTask, payload))
		if !errors.Is(err, asynq.SkipRetry) {
			t.Fatalf("expected skip retry error, got %v", err)
		}
	})

	t.Run("profile load failure", func(t *testing.T) {
		handler := &TaskHandler{
			logger: zap.NewNop(),
			loadProfile: func(ctx context.Context, profileID uint) (*models.Profile, error) {
				return nil, errors.New("db failed")
			},
		}
		payload, _ := json.Marshal(EmbeddingPayload{ProfileID: 1})
		if err := handler.HandleEmbeddingTask(context.Background(), asynq.NewTask(TypeEmbeddingTask, payload)); err == nil {
			t.Fatal("expected load error")
		}
	})

	t.Run("gemini failure", func(t *testing.T) {
		handler := &TaskHandler{
			logger:   zap.NewNop(),
			gemini:   &fakeEmbeddingGenerator{err: errors.New("embed failed")},
			pgvector: &fakeVectorStore{},
			loadProfile: func(ctx context.Context, profileID uint) (*models.Profile, error) {
				return &models.Profile{ID: 1, UserID: 2, FullName: "A"}, nil
			},
		}
		payload, _ := json.Marshal(EmbeddingPayload{ProfileID: 1})
		if err := handler.HandleEmbeddingTask(context.Background(), asynq.NewTask(TypeEmbeddingTask, payload)); err == nil {
			t.Fatal("expected gemini error")
		}
	})

	t.Run("vector upsert failure", func(t *testing.T) {
		handler := &TaskHandler{
			logger:   zap.NewNop(),
			gemini:   &fakeEmbeddingGenerator{},
			pgvector: &fakeVectorStore{upsertErr: errors.New("upsert failed")},
			loadProfile: func(ctx context.Context, profileID uint) (*models.Profile, error) {
				return &models.Profile{ID: 1, UserID: 2, FullName: "A"}, nil
			},
		}
		payload, _ := json.Marshal(EmbeddingPayload{ProfileID: 1})
		if err := handler.HandleEmbeddingTask(context.Background(), asynq.NewTask(TypeEmbeddingTask, payload)); err == nil {
			t.Fatal("expected upsert error")
		}
	})
}

func TestTaskHandlerDeletionTask(t *testing.T) {
	vector := &fakeVectorStore{}
	handler := &TaskHandler{pgvector: vector, logger: zap.NewNop()}

	payload, _ := json.Marshal(DeletionPayload{ProfileID: 22})
	if err := handler.HandleDeletionTask(context.Background(), asynq.NewTask(TypeDeletionTask, payload)); err != nil {
		t.Fatalf("HandleDeletionTask returned error: %v", err)
	}
	if vector.deleteID != 22 {
		t.Fatalf("expected delete id 22 got %d", vector.deleteID)
	}
}

func TestTaskHandlerDeletionTaskErrors(t *testing.T) {
	handler := &TaskHandler{pgvector: &fakeVectorStore{deleteErr: errors.New("delete failed")}, logger: zap.NewNop()}

	err := handler.HandleDeletionTask(context.Background(), asynq.NewTask(TypeDeletionTask, []byte("bad")))
	if !errors.Is(err, asynq.SkipRetry) {
		t.Fatalf("expected skip retry for invalid payload, got %v", err)
	}

	payload, _ := json.Marshal(DeletionPayload{ProfileID: 4})
	if err := handler.HandleDeletionTask(context.Background(), asynq.NewTask(TypeDeletionTask, payload)); err == nil {
		t.Fatal("expected deletion error")
	}
}
