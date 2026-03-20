package ai

import (
	"context"
	"fmt"

	"google.golang.org/genai"
)

// GeminiClient wraps the new google.golang.org/genai SDK client.
type GeminiClient struct {
	models geminiModelAPI
}

type geminiModelAPI interface {
	EmbedContent(context.Context, string, []*genai.Content, *genai.EmbedContentConfig) (*genai.EmbedContentResponse, error)
	GenerateContent(context.Context, string, []*genai.Content, *genai.GenerateContentConfig) (*genai.GenerateContentResponse, error)
}

var newGenAIClient = func(ctx context.Context, cfg *genai.ClientConfig) (*genai.Client, error) {
	return genai.NewClient(ctx, cfg)
}

// NewGeminiClient initialises a GeminiClient using the google.golang.org/genai SDK.
func NewGeminiClient(apiKey string) (*GeminiClient, error) {
	ctx := context.Background()
	client, err := newGenAIClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %w", err)
	}
	return &GeminiClient{models: client.Models}, nil
}

// GenerateEmbedding generates a 3072-dimensional embedding using gemini-embedding-001.
func (c *GeminiClient) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	contents := []*genai.Content{
		{Parts: []*genai.Part{{Text: text}}},
	}
	res, err := c.models.EmbedContent(ctx, "gemini-embedding-001", contents, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to generate embedding: %w", err)
	}
	if len(res.Embeddings) == 0 || res.Embeddings[0].Values == nil {
		return nil, fmt.Errorf("no embedding returned")
	}
	return res.Embeddings[0].Values, nil
}

// GenerateChatResponse sends a message and returns the AI text response.
func (c *GeminiClient) GenerateChatResponse(ctx context.Context, systemPrompt string, userMessage string) (string, error) {
	contents := []*genai.Content{
		{Role: "user", Parts: []*genai.Part{{Text: userMessage}}},
	}
	config := &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{{Text: systemPrompt}},
		},
	}
	res, err := c.models.GenerateContent(ctx, "gemini-2.5-flash", contents, config)
	if err != nil {
		return "", fmt.Errorf("failed to generate response: %w", err)
	}
	if res == nil || len(res.Candidates) == 0 || res.Candidates[0].Content == nil || len(res.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no response generated")
	}
	return res.Candidates[0].Content.Parts[0].Text, nil
}

// Close is a no-op. The google.golang.org/genai client manages its own connection
// lifecycle and does not expose a Close method.
func (c *GeminiClient) Close() {
}
