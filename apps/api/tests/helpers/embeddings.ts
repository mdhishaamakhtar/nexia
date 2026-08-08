import type { EmbeddingGenerator } from "../../src/ai/embeddings";

const DIMENSIONS = 3072;

function hashWord(word: string): number {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) {
    h ^= word.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export interface FakeEmbeddingGenerator extends EmbeddingGenerator {
  calls: string[];
  failNext: (err?: Error) => void;
}

/**
 * A deterministic bag-of-words embedder. Texts that share vocabulary land close
 * together under cosine distance, so RAG ranking assertions are meaningful and
 * repeatable — which a random or constant vector could not give us — without
 * ever calling Gemini.
 */
export function createFakeEmbeddingGenerator(): FakeEmbeddingGenerator {
  const calls: string[] = [];
  let pendingError: Error | null = null;

  return {
    calls,
    failNext(err = new Error("embedding provider unavailable")) {
      pendingError = err;
    },
    async generateEmbedding(text: string): Promise<number[]> {
      calls.push(text);
      if (pendingError) {
        const err = pendingError;
        pendingError = null;
        throw err;
      }

      const vec = new Array<number>(DIMENSIONS).fill(0);
      // A small constant keeps the vector non-zero even for empty text, so
      // pgvector's cosine distance stays defined rather than returning NaN.
      vec[0] = 0.001;

      for (const word of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
        vec[hashWord(word) % DIMENSIONS]! += 1;
      }

      const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
      return vec.map((x) => x / norm);
    },
  };
}
