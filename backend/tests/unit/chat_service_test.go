package unit_test

import (
	"context"
	"errors"
	"testing"

	"nexia-backend/internal/ai"
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
	results []ai.SearchResult
	err     error
}

func (f *fakeVectorClient) SearchContext(ctx context.Context, userID uint64, queryEmbedding []float32, limit int) ([]ai.SearchResult, error) {
	if f.err != nil {
		return nil, f.err
	}
	if f.results == nil {
		return []ai.SearchResult{{Payload: map[string]interface{}{"full_name": "Alice", "top_songs": []interface{}{map[string]interface{}{"name": "Numb", "artist": "LP"}}}}}, nil
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
	vector := &fakeVectorClient{results: []ai.SearchResult{{
		Payload: map[string]interface{}{
			"full_name":         "Alice Example",
			"score":             float64(1.23),
			"food_restrictions": []interface{}{map[string]interface{}{"restriction": "None"}},
			"quotes":            []interface{}{map[string]interface{}{"quote": "Keep going"}},
			"top_songs":         []interface{}{map[string]interface{}{"name": "Numb", "artist": "LP"}},
			"movie_genres":      []interface{}{map[string]interface{}{"genre": "Sci-Fi"}},
			"hangout_places":    []interface{}{map[string]interface{}{"place": "Cafe"}},
			"political_views":   []interface{}{map[string]interface{}{"view": "Moderate"}},
			"tags":              []interface{}{map[string]interface{}{"tag": "travel"}},
			"associated_song":   map[string]interface{}{"name": "Yellow", "artist": "Coldplay"},
			"is_best_friend":    true,
			"misc":              []interface{}{"x", "y"},
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
