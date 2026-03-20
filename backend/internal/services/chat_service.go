package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"nexia-backend/internal/repositories"

	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

// ChatService implements RAG-powered chat over the user's profile data.
// Both Gemini and PgVector must be non-nil for Chat to work; if either is nil the
// service returns ErrAIUnavailable.
type ChatService struct {
	Gemini   GeminiClient
	PgVector VectorSearchClient
}

// GeminiClient is the interface for Gemini AI operations used by ChatService and EmbeddingService.
type GeminiClient interface {
	GenerateEmbedding(ctx context.Context, text string) ([]float32, error)
	GenerateChatResponse(ctx context.Context, systemPrompt string, userMessage string) (string, error)
}

// VectorSearchClient performs cosine-similarity searches against stored profile embeddings.
type VectorSearchClient interface {
	SearchContext(ctx context.Context, userID uint64, queryEmbedding []float32, limit int) ([]repositories.SearchResult, error)
}

// NewChatService constructs a ChatService. Pass nil for either dependency to get a
// service that always returns ErrAIUnavailable (used when AI is not configured).
func NewChatService(gemini GeminiClient, pgvector VectorSearchClient) *ChatService {
	return &ChatService{Gemini: gemini, PgVector: pgvector}
}

// Chat answers a natural-language question about the user's friends using RAG:
// embed the query → vector search → inject top-5 profile payloads → generate response.
func (s *ChatService) Chat(ctx context.Context, userID uint64, message string) (string, error) {
	if s.Gemini == nil || s.PgVector == nil {
		return "", ErrAIUnavailable
	}

	timeoutCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	// 1. Generate Embedding for query
	embedding, err := s.Gemini.GenerateEmbedding(timeoutCtx, message)
	if err != nil {
		return "", fmt.Errorf("embedding failed: %w", err)
	}

	// 2. Search pgvector for similar profiles
	results, err := s.PgVector.SearchContext(timeoutCtx, userID, embedding, 5)
	if err != nil {
		return "", fmt.Errorf("search failed: %w", err)
	}

	// 3. Construct Context from JSONB payload
	var contextBuilder strings.Builder
	contextBuilder.WriteString("Context from my friends:\n")
	caser := cases.Title(language.Und)
	for _, res := range results {
		contextBuilder.WriteString("--- Friend Data ---\n")
		for key, val := range res.Payload {
			readableKey := caser.String(strings.ReplaceAll(key, "_", " "))

			strVal := formatPayloadValue(val)
			if strVal != "" &&
				key != "user_id" && key != "id" && key != "profile_id" &&
				!strings.Contains(key, "created") && !strings.Contains(key, "updated") {
				fmt.Fprintf(&contextBuilder, "%s: %s\n", readableKey, strVal)
			}
		}
		contextBuilder.WriteString("\n")
	}

	finalContext := contextBuilder.String()

	// 4. Generate Response
	systemPrompt := `You are Nexia Intel, a premium AI assistant.
You have access to context about the user's friends provided below.
Rules:
- Be helpful, witty, and concise.
- Use Markdown for all responses (bolding, lists, tables).
- Do NOT use HTML tags like <br> or <div>.
- Do NOT start your response with slashes (/) or use them as bullet points.
- Use standard Markdown spacing (one empty line between paragraphs).
- If you don't know the answer based on the context, say so politely.
- Always refer to friends by their full names if available.`

	response, err := s.Gemini.GenerateChatResponse(timeoutCtx, systemPrompt, fmt.Sprintf("CONTEXT:\n%s\n\nUSER QUESTION: %s", finalContext, message))
	if err != nil {
		return "", err
	}
	if strings.TrimSpace(response) == "" {
		return "", errors.New("empty response from ai")
	}
	return response, nil
}

// formatPayloadValue converts a JSON-decoded any value into a readable string.
// The payload comes from JSONB (decoded via json.Unmarshal), so values are standard Go types.
func formatPayloadValue(val any) string {
	switch v := val.(type) {
	case string:
		return v
	case float64:
		// Numbers (IDs, etc.) — not shown due to key filter above
		return fmt.Sprintf("%v", v)
	case []any:
		// Lists: tags, quotes, songs, restrictions, etc.
		items := []string{}
		for _, item := range v {
			switch iv := item.(type) {
			case string:
				items = append(items, iv)
			case map[string]any:
				// Structs inside lists (songs, quotes, etc.)
				if name, ok := iv["name"]; ok {
					artist := fmt.Sprintf("%v", iv["artist"])
					items = append(items, fmt.Sprintf("%v by %s", name, artist))
				} else if q, ok := iv["quote"]; ok {
					items = append(items, fmt.Sprintf("%q", q))
				} else if r, ok := iv["restriction"]; ok {
					items = append(items, fmt.Sprintf("%v", r))
				} else if t, ok := iv["tag"]; ok {
					items = append(items, fmt.Sprintf("%v", t))
				} else if p, ok := iv["place"]; ok {
					items = append(items, fmt.Sprintf("%v", p))
				} else if vw, ok := iv["view"]; ok {
					items = append(items, fmt.Sprintf("%v", vw))
				} else if g, ok := iv["genre"]; ok {
					items = append(items, fmt.Sprintf("%v", g))
				}
			}
		}
		return strings.Join(items, ", ")
	case map[string]any:
		// Single struct (AssociatedSong)
		if name, ok := v["name"]; ok {
			artist := fmt.Sprintf("%v", v["artist"])
			return fmt.Sprintf("%v by %s", name, artist)
		}
		return ""
	case bool:
		return fmt.Sprintf("%v", v)
	default:
		return ""
	}
}
