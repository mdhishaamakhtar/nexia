import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed } from "ai";
import { errAIUnavailable } from "../services/errors";

export type EmbeddingGenerator = {
  generateEmbedding(text: string): Promise<number[]>;
};

export function createEmbeddingGenerator(apiKey: string): EmbeddingGenerator {
  const google = createGoogleGenerativeAI({ apiKey });
  const model = google.embedding("gemini-embedding-001");

  return {
    async generateEmbedding(text: string): Promise<number[]> {
      const { embedding } = await embed({
        model,
        value: text,
        providerOptions: {
          google: { outputDimensionality: 3072 },
        },
      });
      if (!embedding || embedding.length !== 3072) {
        throw errAIUnavailable(
          `Expected 3072-dim embedding, got ${embedding?.length ?? 0}`
        );
      }
      return embedding;
    },
  };
}
