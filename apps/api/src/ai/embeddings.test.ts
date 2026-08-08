import { describe, test, expect, vi } from "vitest";
import { MockEmbeddingModelV4 } from "ai/test";
import { ServiceError, ErrorKind } from "../services/errors";

/*
 * Only the Google provider is stubbed. The real `embed()` call, the real
 * providerOptions, and the real dimension check all still run — which is the
 * part worth testing, since a wrong-sized vector is unusable by pgvector.
 */
const state = vi.hoisted(() => ({
  embedding: [] as number[],
  apiKeys: [] as string[],
  modelIds: [] as string[],
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogle: ({ apiKey }: { apiKey: string }) => {
    state.apiKeys.push(apiKey);
    return {
      embedding: (modelId: string) => {
        state.modelIds.push(modelId);
        // The result object form: the model is built once per generator, and
        // each test sets `state.embedding` before constructing its generator.
        return new MockEmbeddingModelV4({
          doEmbed: { embeddings: [state.embedding], usage: { tokens: 1 }, warnings: [] },
        });
      },
    };
  },
}));

const { createEmbeddingGenerator } = await import("./embeddings");

function vectorOf(length: number): number[] {
  return Array.from({ length }, (_, i) => i / length);
}

describe("createEmbeddingGenerator", () => {
  test("returns the embedding when the model produces 3072 dimensions", async () => {
    state.embedding = vectorOf(3072);
    const generator = createEmbeddingGenerator("test-key");

    const embedding = await generator.generateEmbedding("some profile text");
    expect(embedding).toHaveLength(3072);
  });

  test("passes the API key and model id through to the provider", async () => {
    state.embedding = vectorOf(3072);
    state.apiKeys.length = 0;
    state.modelIds.length = 0;

    await createEmbeddingGenerator("another-key").generateEmbedding("text");

    expect(state.apiKeys).toContain("another-key");
    expect(state.modelIds).toContain("gemini-embedding-001");
  });

  test("rejects a wrongly-sized vector rather than storing it", async () => {
    // pgvector's column is fixed at 3072; a short vector would fail at insert
    // time inside a queue worker, far from the cause.
    state.embedding = vectorOf(768);
    const generator = createEmbeddingGenerator("test-key");

    await expect(generator.generateEmbedding("text")).rejects.toBeInstanceOf(ServiceError);
    await expect(generator.generateEmbedding("text")).rejects.toMatchObject({
      kind: ErrorKind.AIUnavailable,
    });
  });

  test("reports the size it actually received", async () => {
    state.embedding = vectorOf(10);
    try {
      await createEmbeddingGenerator("test-key").generateEmbedding("text");
      expect.unreachable();
    } catch (err) {
      expect((err as ServiceError).message).toContain("got 10");
    }
  });
});
