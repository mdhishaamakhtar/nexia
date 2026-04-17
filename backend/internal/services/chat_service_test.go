package services_test

import (
	"context"
	"errors"
	"testing"

	"nexia-backend/internal/repositories"
	"nexia-backend/internal/services"

	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

func TestChatServiceAIUnavailable(t *testing.T) {
	svc := services.NewChatService(nil, nil)
	_, err := svc.Chat(context.Background(), 1, "hello")
	require.ErrorIs(t, err, services.ErrAIUnavailable)
}

func TestChatServiceEmbeddingFailure(t *testing.T) {
	ctrl := gomock.NewController(t)
	gemini := NewMockGeminiClient(ctrl)
	vector := NewMockVectorSearchClient(ctrl)

	gemini.EXPECT().GenerateEmbedding(gomock.Any(), "hello").Return(nil, errors.New("embed fail"))

	svc := services.NewChatService(gemini, vector)
	_, err := svc.Chat(context.Background(), 1, "hello")
	require.EqualError(t, err, "embedding failed: embed fail")
}

func TestChatServiceSearchFailure(t *testing.T) {
	ctrl := gomock.NewController(t)
	gemini := NewMockGeminiClient(ctrl)
	vector := NewMockVectorSearchClient(ctrl)

	queryEmbedding := []float32{0.1, 0.2}
	gomock.InOrder(
		gemini.EXPECT().GenerateEmbedding(gomock.Any(), "hello").Return(queryEmbedding, nil),
		vector.EXPECT().SearchContext(gomock.Any(), uint64(1), queryEmbedding, 5).Return(nil, errors.New("search fail")),
	)

	svc := services.NewChatService(gemini, vector)
	_, err := svc.Chat(context.Background(), 1, "hello")
	require.EqualError(t, err, "search failed: search fail")
}

func TestChatServiceEmptyResponse(t *testing.T) {
	ctrl := gomock.NewController(t)
	gemini := NewMockGeminiClient(ctrl)
	vector := NewMockVectorSearchClient(ctrl)

	queryEmbedding := []float32{0.1, 0.2}
	gomock.InOrder(
		gemini.EXPECT().GenerateEmbedding(gomock.Any(), "hello").Return(queryEmbedding, nil),
		vector.EXPECT().SearchContext(gomock.Any(), uint64(1), queryEmbedding, 5).Return(nil, nil),
		gemini.EXPECT().GenerateChatResponse(gomock.Any(), gomock.Any(), gomock.Any()).Return("   ", nil),
	)

	svc := services.NewChatService(gemini, vector)
	_, err := svc.Chat(context.Background(), 1, "hello")
	require.EqualError(t, err, "empty response from ai")
}

func TestChatServiceChatFailure(t *testing.T) {
	ctrl := gomock.NewController(t)
	gemini := NewMockGeminiClient(ctrl)
	vector := NewMockVectorSearchClient(ctrl)

	queryEmbedding := []float32{0.1, 0.2}
	gomock.InOrder(
		gemini.EXPECT().GenerateEmbedding(gomock.Any(), "hello").Return(queryEmbedding, nil),
		vector.EXPECT().SearchContext(gomock.Any(), uint64(1), queryEmbedding, 5).Return(nil, nil),
		gemini.EXPECT().GenerateChatResponse(gomock.Any(), gomock.Any(), gomock.Any()).Return("", errors.New("chat fail")),
	)

	svc := services.NewChatService(gemini, vector)
	_, err := svc.Chat(context.Background(), 1, "hello")
	require.EqualError(t, err, "chat fail")
}

func TestChatServiceSuccess(t *testing.T) {
	ctrl := gomock.NewController(t)
	gemini := NewMockGeminiClient(ctrl)
	vector := NewMockVectorSearchClient(ctrl)

	queryEmbedding := []float32{0.1, 0.2}
	vectorResults := []repositories.SearchResult{{
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
	}}

	gomock.InOrder(
		gemini.EXPECT().GenerateEmbedding(gomock.Any(), "Tell me about Alice").Return(queryEmbedding, nil),
		vector.EXPECT().SearchContext(gomock.Any(), uint64(1), queryEmbedding, 5).Return(vectorResults, nil),
		gemini.EXPECT().GenerateChatResponse(gomock.Any(), gomock.Any(), gomock.Any()).Return("Answer", nil),
	)

	svc := services.NewChatService(gemini, vector)
	resp, err := svc.Chat(context.Background(), 1, "Tell me about Alice")
	require.NoError(t, err)
	require.Equal(t, "Answer", resp)
}

func TestChatServiceAssociatedSongNoName(t *testing.T) {
	ctrl := gomock.NewController(t)
	gemini := NewMockGeminiClient(ctrl)
	vector := NewMockVectorSearchClient(ctrl)

	queryEmbedding := []float32{0.1, 0.2}
	vectorResults := []repositories.SearchResult{{
		Payload: map[string]any{
			"full_name":       "Bob",
			"associated_song": map[string]any{"unknown_field": "value"},
		},
	}}

	gomock.InOrder(
		gemini.EXPECT().GenerateEmbedding(gomock.Any(), "Tell me about Bob").Return(queryEmbedding, nil),
		vector.EXPECT().SearchContext(gomock.Any(), uint64(1), queryEmbedding, 5).Return(vectorResults, nil),
		gemini.EXPECT().GenerateChatResponse(gomock.Any(), gomock.Any(), gomock.Any()).Return("Answer", nil),
	)

	svc := services.NewChatService(gemini, vector)
	resp, err := svc.Chat(context.Background(), 1, "Tell me about Bob")
	require.NoError(t, err)
	require.Equal(t, "Answer", resp)
}
