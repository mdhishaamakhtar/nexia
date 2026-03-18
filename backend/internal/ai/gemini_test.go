package ai

import (
	"context"
	"errors"
	"strings"
	"testing"

	"google.golang.org/genai"
)

type fakeGeminiModels struct {
	embedResp    *genai.EmbedContentResponse
	embedErr     error
	generateResp *genai.GenerateContentResponse
	generateErr  error
	lastEmbed    string
	lastPrompt   string
	lastMessage  string
}

func (f *fakeGeminiModels) EmbedContent(ctx context.Context, model string, contents []*genai.Content, cfg *genai.EmbedContentConfig) (*genai.EmbedContentResponse, error) {
	if len(contents) > 0 && len(contents[0].Parts) > 0 {
		f.lastEmbed = contents[0].Parts[0].Text
	}
	return f.embedResp, f.embedErr
}

func (f *fakeGeminiModels) GenerateContent(ctx context.Context, model string, contents []*genai.Content, cfg *genai.GenerateContentConfig) (*genai.GenerateContentResponse, error) {
	if cfg != nil && cfg.SystemInstruction != nil && len(cfg.SystemInstruction.Parts) > 0 {
		f.lastPrompt = cfg.SystemInstruction.Parts[0].Text
	}
	if len(contents) > 0 && len(contents[0].Parts) > 0 {
		f.lastMessage = contents[0].Parts[0].Text
	}
	return f.generateResp, f.generateErr
}

func TestGeminiClientGenerateEmbedding(t *testing.T) {
	models := &fakeGeminiModels{
		embedResp: &genai.EmbedContentResponse{
			Embeddings: []*genai.ContentEmbedding{{Values: []float32{0.1, 0.2}}},
		},
	}
	client := &GeminiClient{models: models}

	embedding, err := client.GenerateEmbedding(context.Background(), "profile text")
	if err != nil {
		t.Fatalf("GenerateEmbedding returned error: %v", err)
	}
	if len(embedding) != 2 || models.lastEmbed != "profile text" {
		t.Fatalf("unexpected embedding result %+v text=%q", embedding, models.lastEmbed)
	}
}

func TestNewGeminiClient(t *testing.T) {
	old := newGenAIClient
	defer func() { newGenAIClient = old }()

	t.Run("constructor error", func(t *testing.T) {
		newGenAIClient = func(ctx context.Context, cfg *genai.ClientConfig) (*genai.Client, error) {
			return nil, errors.New("boom")
		}
		if _, err := NewGeminiClient("api-key"); err == nil || !strings.Contains(err.Error(), "failed to create Gemini client") {
			t.Fatalf("unexpected error %v", err)
		}
	})

	t.Run("success", func(t *testing.T) {
		newGenAIClient = old
		client, err := NewGeminiClient("api-key")
		if err != nil {
			t.Fatalf("NewGeminiClient returned error: %v", err)
		}
		if client == nil || client.models == nil {
			t.Fatalf("expected initialized gemini client, got %+v", client)
		}
		client.Close()
	})
}

func TestGeminiClientGenerateEmbeddingErrors(t *testing.T) {
	t.Run("model error", func(t *testing.T) {
		client := &GeminiClient{models: &fakeGeminiModels{embedErr: errors.New("boom")}}
		_, err := client.GenerateEmbedding(context.Background(), "x")
		err = mustEmbeddingError(t, nil, err)
		if !strings.Contains(err.Error(), "failed to generate embedding") {
			t.Fatalf("unexpected error %v", err)
		}
	})

	t.Run("missing embeddings", func(t *testing.T) {
		client := &GeminiClient{models: &fakeGeminiModels{embedResp: &genai.EmbedContentResponse{}}}
		_, err := client.GenerateEmbedding(context.Background(), "x")
		err = mustEmbeddingError(t, nil, err)
		if !strings.Contains(err.Error(), "no embedding returned") {
			t.Fatalf("unexpected error %v", err)
		}
	})
}

func TestGeminiClientGenerateChatResponse(t *testing.T) {
	models := &fakeGeminiModels{
		generateResp: &genai.GenerateContentResponse{
			Candidates: []*genai.Candidate{{
				Content: &genai.Content{Parts: []*genai.Part{{Text: "hello back"}}},
			}},
		},
	}
	client := &GeminiClient{models: models}

	resp, err := client.GenerateChatResponse(context.Background(), "system rules", "hi")
	if err != nil {
		t.Fatalf("GenerateChatResponse returned error: %v", err)
	}
	if resp != "hello back" || models.lastPrompt != "system rules" || models.lastMessage != "hi" {
		t.Fatalf("unexpected response=%q prompt=%q message=%q", resp, models.lastPrompt, models.lastMessage)
	}
}

func TestGeminiClientGenerateChatResponseErrors(t *testing.T) {
	t.Run("model error", func(t *testing.T) {
		client := &GeminiClient{models: &fakeGeminiModels{generateErr: errors.New("boom")}}
		_, err := client.GenerateChatResponse(context.Background(), "system", "hi")
		if err == nil || !strings.Contains(err.Error(), "failed to generate response") {
			t.Fatalf("unexpected error %v", err)
		}
	})

	t.Run("missing candidate", func(t *testing.T) {
		client := &GeminiClient{models: &fakeGeminiModels{generateResp: &genai.GenerateContentResponse{}}}
		_, err := client.GenerateChatResponse(context.Background(), "system", "hi")
		if err == nil || !strings.Contains(err.Error(), "no response generated") {
			t.Fatalf("unexpected error %v", err)
		}
	})

}

func mustEmbeddingError(t *testing.T, _ []float32, err error) error {
	t.Helper()
	if err == nil {
		t.Fatal("expected error")
	}
	return err
}
