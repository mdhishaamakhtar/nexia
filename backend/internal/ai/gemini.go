package ai

import (
	"context"
	"fmt"

	"google.golang.org/genai"
)

// GeminiClient wraps the new google.golang.org/genai SDK client.
type GeminiClient struct {
	client *genai.Client
}

func NewGeminiClient(apiKey string) (*GeminiClient, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create Gemini client: %w", err)
	}
	return &GeminiClient{client: client}, nil
}

// GenerateEmbedding generates a 3072-dimensional embedding using gemini-embedding-001.
func (c *GeminiClient) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	contents := []*genai.Content{
		{Parts: []*genai.Part{{Text: text}}},
	}
	res, err := c.client.Models.EmbedContent(ctx, "gemini-embedding-001", contents, nil)
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
	res, err := c.client.Models.GenerateContent(ctx, "gemini-2.5-flash", contents, config)
	if err != nil {
		return "", fmt.Errorf("failed to generate response: %w", err)
	}
	if res == nil || len(res.Candidates) == 0 || res.Candidates[0].Content == nil || len(res.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no response generated")
	}
	return res.Candidates[0].Content.Parts[0].Text, nil
}

func (c *GeminiClient) Close() {
	// google.golang.org/genai client does not require explicit close
}
