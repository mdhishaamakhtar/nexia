package ai

import (
	"context"
	"fmt"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type GeminiClient struct {
	client *genai.Client
	model  *genai.GenerativeModel
	emb    *genai.EmbeddingModel
}

func NewGeminiClient(apiKey string) (*GeminiClient, error) {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, err
	}

	return &GeminiClient{
		client: client,
		model:  client.GenerativeModel("gemini-flash-latest"),
		emb:    client.EmbeddingModel("text-embedding-004"),
	}, nil
}

func (c *GeminiClient) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	res, err := c.emb.EmbedContent(ctx, genai.Text(text))
	if err != nil {
		return nil, fmt.Errorf("failed to generate embedding: %w", err)
	}
	if res.Embedding == nil {
		return nil, fmt.Errorf("no embedding returned")
	}
	return res.Embedding.Values, nil
}

func (c *GeminiClient) GenerateChatResponse(ctx context.Context, history []*genai.Content, message string) (string, error) {
	cs := c.model.StartChat()
	cs.History = history

	res, err := cs.SendMessage(ctx, genai.Text(message))
	if err != nil {
		return "", err
	}

	if len(res.Candidates) == 0 || len(res.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no response generated")
	}

	// Assuming text response
	if txt, ok := res.Candidates[0].Content.Parts[0].(genai.Text); ok {
		return string(txt), nil
	}

	return "", fmt.Errorf("unexpected response type")
}

func (c *GeminiClient) Close() {
	c.client.Close()
}
