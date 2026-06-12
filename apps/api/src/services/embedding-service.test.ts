import { describe, test, expect } from "bun:test";
import { EmbeddingService, type EmbeddingGenerator, type EmbeddingStorage } from "../services/embedding-service";
import { ServiceError, ErrorKind } from "../services/errors";
import pino from "pino";

const logger = pino({ level: "silent" });

class FakeEmbeddingGenerator implements EmbeddingGenerator {
  generatedText = "";
  err: Error | null = null;
  async generateEmbedding(text: string) {
    if (this.err) throw this.err;
    this.generatedText = text;
    return new Array(3072).fill(0.001);
  }
}

class FakeEmbeddingStorage implements EmbeddingStorage {
  upserted: Array<{ profileId: number; userId: number; embedding: number[]; payload: Record<string, unknown> }> = [];
  deletedProfiles: number[] = [];
  upsertErr: Error | null = null;
  deleteErr: Error | null = null;

  async upsertProfile(profileId: number, userId: number, embedding: number[], payload: Record<string, unknown>) {
    if (this.upsertErr) throw this.upsertErr;
    this.upserted.push({ profileId, userId, embedding, payload });
  }
  async deleteProfile(profileId: number) {
    if (this.deleteErr) throw this.deleteErr;
    this.deletedProfiles.push(profileId);
  }
}

class FakeProfileRepoForEmbedding {
  data: Record<string, unknown> | null = {
    id: 7,
    userId: 42,
    fullName: "Alice",
    bio: "A great friend",
    profession: "Engineer",
    relationshipType: "Friend",
    zodiacSign: "Aries",
    birthday: "2001-03-22",
    longTermGoals: "Travel",
    musicPreference: "Pop",
    favoriteMovie: "Inception",
    favoriteBook: "Dune",
    favoriteMemory: "Road trip",
    notes: "Awesome",
    tags: [{ tag: "kind" }, { tag: "funny" }],
    politicalViews: [{ view: "moderate" }],
    foodRestrictions: [{ restriction: "vegetarian" }],
    movieGenres: [{ genre: "sci-fi" }],
    bookGenres: [{ genre: "fiction" }],
    hangoutPlaces: [{ place: "coffee shop" }],
    quotes: [{ quote: "Be yourself" }],
    topSongs: [{ name: "Song 1", artist: "Artist 1" }],
    associatedSong: { name: "Anthem", artist: "Band" },
  };
  err: Error | null = null;

  async loadForEmbedding(_profileId: number) {
    if (this.err) throw this.err;
    return this.data;
  }
}

describe("EmbeddingService", () => {
  test("embed profile success", async () => {
    const profiles = new FakeProfileRepoForEmbedding();
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
  });

  test("embed profile not found", async () => {
    const profiles = new FakeProfileRepoForEmbedding();
    profiles.data = null;
    const svc = new EmbeddingService(profiles, new FakeEmbeddingGenerator(), new FakeEmbeddingStorage(), logger);

    try {
      await svc.embedProfile(7);
      expect.unreachable();
    } catch (err) {
      expect(err instanceof ServiceError).toBe(true);
      expect((err as ServiceError).kind).toBe(ErrorKind.NotFound);
    }
  });

  test("embed profile generation error", async () => {
    const profiles = new FakeProfileRepoForEmbedding();
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
    const profiles = new FakeProfileRepoForEmbedding();
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
    const svc = new EmbeddingService(new FakeProfileRepoForEmbedding(), new FakeEmbeddingGenerator(), repo, logger);

    await svc.deleteEmbedding(7);
    expect(repo.deletedProfiles).toEqual([7]);
  });

  test("delete embedding error", async () => {
    const repo = new FakeEmbeddingStorage();
    repo.deleteErr = new Error("db error");
    const svc = new EmbeddingService(new FakeProfileRepoForEmbedding(), new FakeEmbeddingGenerator(), repo, logger);

    try {
      await svc.deleteEmbedding(7);
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).toBe("db error");
    }
  });
});
