import { describe, test, expect } from "bun:test";
import type { ProfileOutput } from "@nexia/shared";
import {
  EmbeddingService,
  type EmbeddingGenerator,
  type EmbeddingStorage,
  type ProfileLoader,
} from "../services/embedding-service";
import { ServiceError, ErrorKind } from "../services/errors";
import pino from "pino";
const logger = pino({ level: "silent" });

class FakeEmbeddingGenerator implements EmbeddingGenerator {
  generatedText = "";
  err: Error | null = null;
  async generateEmbedding(text: string) {
    if (this.err) throw this.err;
    this.generatedText = text;
    return new Array<number>(3072).fill(0.001) as number[];
  }
}

class FakeEmbeddingStorage implements EmbeddingStorage {
  upserted: Array<{
    profileId: number;
    userId: number;
    embedding: number[];
    payload: Record<string, unknown>;
  }> = [];
  deletedProfiles: number[] = [];
  upsertErr: Error | null = null;
  deleteErr: Error | null = null;

  async upsertProfile(
    profileId: number,
    userId: number,
    embedding: number[],
    payload: Record<string, unknown>
  ) {
    if (this.upsertErr) throw this.upsertErr;
    this.upserted.push({ profileId, userId, embedding, payload });
  }
  async deleteProfile(profileId: number) {
    if (this.deleteErr) throw this.deleteErr;
    this.deletedProfiles.push(profileId);
  }
}

describe("EmbeddingService", () => {
  function fullProfileRepo(): ProfileLoader {
    return {
      async loadForEmbedding(_profileId: number): Promise<ProfileOutput> {
        return {
          id: 7,
          user_id: 42,
          full_name: "Alice",
          relationship_type: "Friend",
          bio: "A great friend",
          profession: "Engineer",
          long_term_goals: "Travel",
          birthday: "2001-03-22",
          zodiac_sign: "Aries",
          music_preference: "Pop",
          favorite_movie: "Inception",
          favorite_book: "Dune",
          notes: "Awesome",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          tags: [
            { id: 1, profile_id: 7, tag: "kind" },
            { id: 2, profile_id: 7, tag: "funny" },
          ],
          political_views: [{ id: 1, profile_id: 7, view: "moderate" }],
          food_restrictions: [{ id: 1, profile_id: 7, restriction: "vegetarian" }],
          movie_genres: [{ id: 1, profile_id: 7, genre: "sci-fi" }],
          book_genres: [{ id: 1, profile_id: 7, genre: "fiction" }],
          hangout_places: [{ id: 1, profile_id: 7, place: "coffee shop" }],
          quotes: [{ id: 1, profile_id: 7, quote: "Be yourself" }],
          favorite_memories: [{ id: 1, profile_id: 7, memory: "Road trip" }],
          top_songs: [{ id: 1, profile_id: 7, name: "Song 1", artist: "Artist 1" }],
          associated_song: { profile_id: 7, name: "Anthem", artist: "Band" },
        };
      },
    };
  }

  function emptyProfileRepo(): ProfileLoader {
    return {
      async loadForEmbedding(_profileId: number) {
        return null;
      },
    };
  }

  test("embed profile success", async () => {
    const profiles = fullProfileRepo();
    const generator = new FakeEmbeddingGenerator();
    const repo = new FakeEmbeddingStorage();
    const svc = new EmbeddingService(profiles, generator, repo, logger);

    await svc.embedProfile(7);
    expect(repo.upserted.length).toBe(1);
    expect(repo.upserted[0]!.profileId).toBe(7);
    expect(repo.upserted[0]!.userId).toBe(42);
    expect(generator.generatedText).toContain("Profile of Alice");
    expect(generator.generatedText).toContain("March 22, 2001");
    expect(generator.generatedText).toContain('"Be yourself"');
    expect(generator.generatedText).toContain("Favorite Memories: Road trip");
  });

  test("embed profile not found", async () => {
    const profiles = emptyProfileRepo();
    const svc = new EmbeddingService(
      profiles,
      new FakeEmbeddingGenerator(),
      new FakeEmbeddingStorage(),
      logger
    );

    try {
      await svc.embedProfile(7);
      expect.unreachable();
    } catch (err) {
      expect(err instanceof ServiceError).toBe(true);
      expect((err as ServiceError).kind).toBe(ErrorKind.NotFound);
    }
  });

  test("embed profile generation error", async () => {
    const profiles = fullProfileRepo();
    const generator = new FakeEmbeddingGenerator();
    generator.err = new Error("api error");
    const svc = new EmbeddingService(profiles, generator, new FakeEmbeddingStorage(), logger);

    try {
      await svc.embedProfile(7);
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).toContain("gemini embedding failed");
    }
  });

  test("embed profile upsert error", async () => {
    const profiles = fullProfileRepo();
    const repo = new FakeEmbeddingStorage();
    repo.upsertErr = new Error("db error");
    const svc = new EmbeddingService(profiles, new FakeEmbeddingGenerator(), repo, logger);

    try {
      await svc.embedProfile(7);
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).toContain("pgvector upsert failed");
    }
  });

  test("delete embedding success", async () => {
    const repo = new FakeEmbeddingStorage();
    const svc = new EmbeddingService(fullProfileRepo(), new FakeEmbeddingGenerator(), repo, logger);

    await svc.deleteEmbedding(7);
    expect(repo.deletedProfiles).toEqual([7]);
  });

  test("delete embedding error", async () => {
    const repo = new FakeEmbeddingStorage();
    repo.deleteErr = new Error("db error");
    const svc = new EmbeddingService(fullProfileRepo(), new FakeEmbeddingGenerator(), repo, logger);

    try {
      await svc.deleteEmbedding(7);
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).toBe("db error");
    }
  });
});
