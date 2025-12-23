package services

import (
	"context"
	"fmt"
	"strings"

	"nexia-backend/internal/ai"

	"github.com/google/generative-ai-go/genai"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

type ChatService struct {
	Gemini *ai.GeminiClient
	Qdrant *ai.QdrantClient
}

func NewChatService(gemini *ai.GeminiClient, qdrant *ai.QdrantClient) *ChatService {
	return &ChatService{Gemini: gemini, Qdrant: qdrant}
}

func (s *ChatService) Chat(ctx context.Context, userID uint64, message string) (string, error) {
	// 1. Generate Embedding for query
	embedding, err := s.Gemini.GenerateEmbedding(ctx, message)
	if err != nil {
		return "", fmt.Errorf("embedding failed: %w", err)
	}

	// 2. Search Qdrant
	points, err := s.Qdrant.SearchContext(ctx, userID, embedding, 5)
	if err != nil {
		return "", fmt.Errorf("search failed: %w", err)
	}

	// 3. Construct Context
	var contextBuilder strings.Builder
	contextBuilder.WriteString("Context from my friends:\n")
	for _, p := range points {
		if p.Payload != nil {
			contextBuilder.WriteString("--- Friend Data ---\n")
			// Iterate through all payload keys to provide full context
			for key, val := range p.Payload {
				// Format key for readability
				readableKey := cases.Title(language.Und).String(strings.ReplaceAll(key, "_", " "))

				// Handle different value types from structpb
				var strVal string
				if s := val.GetStringValue(); s != "" {
					strVal = s
				} else if l := val.GetListValue(); l != nil {
					// Handle lists (like tags, quotes, restrictions)
					items := []string{}
					for _, v := range l.Values {
						if vs := v.GetStringValue(); vs != "" {
							items = append(items, vs)
						} else if structVal := v.GetStructValue(); structVal != nil {
							// Generic field detector for list of structs
							if f, ok := structVal.Fields["name"]; ok {
								artist := structVal.Fields["artist"].GetStringValue()
								items = append(items, fmt.Sprintf("%s by %s", f.GetStringValue(), artist))
							} else if f, ok := structVal.Fields["quote"]; ok {
								items = append(items, fmt.Sprintf("\"%s\"", f.GetStringValue()))
							} else if f, ok := structVal.Fields["restriction"]; ok {
								items = append(items, f.GetStringValue())
							} else if f, ok := structVal.Fields["tag"]; ok {
								items = append(items, f.GetStringValue())
							} else if f, ok := structVal.Fields["place"]; ok {
								items = append(items, f.GetStringValue())
							} else if f, ok := structVal.Fields["view"]; ok {
								items = append(items, f.GetStringValue())
							} else if f, ok := structVal.Fields["genre"]; ok {
								items = append(items, f.GetStringValue())
							}
						}
					}
					if len(items) > 0 {
						strVal = strings.Join(items, ", ")
					}
				}

				if strVal != "" && key != "user_id" && key != "id" && key != "profile_id" && !strings.Contains(key, "created") && !strings.Contains(key, "updated") {
					contextBuilder.WriteString(fmt.Sprintf("%s: %s\n", readableKey, strVal))
				}
			}
			contextBuilder.WriteString("\n")
		}
	}

	finalContext := contextBuilder.String()

	// 4. Generate Response
	// We use a fresh chat session for now, or could pass history if frontend sends it
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

	prompt := fmt.Sprintf("%s\n\nCONTEXT:\n%s\n\nUSER QUESTION: %s\n\n", systemPrompt, finalContext, message)
	return s.Gemini.GenerateChatResponse(ctx, []*genai.Content{}, prompt)
}
