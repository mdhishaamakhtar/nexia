package services_test

import (
	"context"
	"errors"
	"testing"

	"nexia-backend/internal/repositories"
	"nexia-backend/internal/services"
)

type fakeGeminiClient struct {
	embedding []float32
	embedErr  error
	chatResp  string
	chatErr   error
}

func (f *fakeGeminiClient) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	if f.embedErr != nil {
		return nil, f.embedErr
	}
	if f.embedding == nil {
		return []float32{0.1, 0.2}, nil
	}
	return f.embedding, nil
}

func (f *fakeGeminiClient) GenerateChatResponse(ctx context.Context, systemPrompt string, userMessage string) (string, error) {
	if f.chatErr != nil {
		return "", f.chatErr
	}
	return f.chatResp, nil
}

type fakeVectorClient struct {
	results []repositories.SearchResult
	err     error
}

func (f *fakeVectorClient) SearchContext(ctx context.Context, userID uint64, queryEmbedding []float32, limit int) ([]repositories.SearchResult, error) {
	if f.err != nil {
		return nil, f.err
	}
	if f.results == nil {
		return []repositories.SearchResult{{Payload: map[string]any{"full_name": "Alice", "top_songs": []any{map[string]any{"name": "Numb", "artist": "LP"}}}}}, nil
	}
	return f.results, nil
}

func TestChatServiceAIUnavailable(t *testing.T) {
	svc := services.NewChatService(nil, nil)
	_, err := svc.Chat(context.Background(), 1, "hello")
	if !errors.Is(err, services.ErrAIUnavailable) {
		t.Fatalf("expected ErrAIUnavailable, got %v", err)
	}
}

func TestChatServiceEmbeddingFailure(t *testing.T) {
	svc := services.NewChatService(&fakeGeminiClient{embedErr: errors.New("embed fail")}, &fakeVectorClient{})
	_, err := svc.Chat(context.Background(), 1, "hello")
	if err == nil || err.Error() != "embedding failed: embed fail" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestChatServiceSearchFailure(t *testing.T) {
	svc := services.NewChatService(&fakeGeminiClient{}, &fakeVectorClient{err: errors.New("search fail")})
	_, err := svc.Chat(context.Background(), 1, "hello")
	if err == nil || err.Error() != "search failed: search fail" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestChatServiceEmptyResponse(t *testing.T) {
	svc := services.NewChatService(&fakeGeminiClient{chatResp: "   "}, &fakeVectorClient{})
	_, err := svc.Chat(context.Background(), 1, "hello")
	if err == nil || err.Error() != "empty response from ai" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestChatServiceChatFailure(t *testing.T) {
	svc := services.NewChatService(&fakeGeminiClient{chatErr: errors.New("chat fail")}, &fakeVectorClient{})
	_, err := svc.Chat(context.Background(), 1, "hello")
	if err == nil || err.Error() != "chat fail" {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestChatServiceSuccess(t *testing.T) {
	gemini := &fakeGeminiClient{chatResp: "Answer"}
	vector := &fakeVectorClient{results: []repositories.SearchResult{{
		Payload: map[string]any{
			"full_name":         "Alice Example",
			"score":             float64(1.23),
			"food_restrictions": []any{map[string]any{"restriction": "None"}},
			"quotes":            []any{map[string]any{"quote": "Keep going"}},
			"top_songs":         []any{map[string]any{"name": "Numb", "artist": "LP"}},
			"movie_genres":      []any{map[string]any{"genre": "Sci-Fi"}},
			"hangout_places":    []any{map[string]any{"place": "Cafe"}},
			"political_views":   []any{map[string]any{"view": "Moderate"}},
			"tags":              []any{map[string]any{"tag": "travel"}},
			"associated_song":   map[string]any{"name": "Yellow", "artist": "Coldplay"},
			"is_best_friend":    true,
			"misc":              []any{"x", "y"},
		},
	}}}
	svc := services.NewChatService(gemini, vector)

	resp, err := svc.Chat(context.Background(), 1, "Tell me about Alice")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp != "Answer" {
		t.Fatalf("expected Answer got %s", resp)
	}
}

func TestChatServiceAssociatedSongNoName(t *testing.T) {
	// associated_song as a map without a "name" key — formatPayloadValue map branch returns ""
	gemini := &fakeGeminiClient{chatResp: "Answer"}
	vector := &fakeVectorClient{results: []repositories.SearchResult{{
		Payload: map[string]any{
			"full_name":       "Bob",
			"associated_song": map[string]any{"unknown_field": "value"},
		},
	}}}
	svc := services.NewChatService(gemini, vector)

	resp, err := svc.Chat(context.Background(), 1, "Tell me about Bob")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp != "Answer" {
		t.Fatalf("expected Answer got %s", resp)
	}
}
