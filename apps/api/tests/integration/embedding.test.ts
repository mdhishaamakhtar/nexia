import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import type { ProfileOutput } from "@nexia/shared";
import { profileEmbeddings } from "../../src/db/schema";
import { EmbeddingRepository } from "../../src/repositories/embedding";
import { buildEmbeddingText } from "../../src/services/embedding-service";
import { createHarness, type Harness } from "../helpers/harness";
import { bearerAuth, call, profileInput, seedUser } from "../helpers/factories";
import { waitFor, waitUntilGone } from "../helpers/wait";

let h: Harness;

beforeAll(() => {
  h = createHarness({ withQueue: true });
});
afterAll(async () => {
  await h.close();
});
beforeEach(async () => {
  // Jobs outlive the database truncation, so clear them too.
  await h.redis!.flushall();
});

async function storedEmbedding(profileId: number) {
  const [row] = await h.db
    .select()
    .from(profileEmbeddings)
    .where(eq(profileEmbeddings.profileId, profileId));
  return row;
}

describe("embedding pipeline", () => {
  test("creating a profile drives a job through to a pgvector row", async () => {
    const user = await seedUser(h);
    const headers = await bearerAuth(h, user.id);

    const created = await call<{ id: number }>(h.app, "POST", "/api/v1/profiles", {
      headers,
      body: profileInput({ full_name: "Ada Lovelace", bio: "counts things" }),
    });
    expect(created.status).toBe(201);

    const row = await waitFor(() => storedEmbedding(created.body.id), {
      what: "the embedding row",
    });

    expect(row.userId).toBe(user.id);
    expect(row.embedding).toHaveLength(3072);
    // The payload is a full ProfileOutput snapshot, which is what RAG returns.
    const payload = row.payload as ProfileOutput;
    expect(payload.full_name).toBe("Ada Lovelace");
    expect(payload.bio).toBe("counts things");
  });

  test("updating a profile refreshes the stored snapshot", async () => {
    const user = await seedUser(h);
    const headers = await bearerAuth(h, user.id);

    const created = await call<{ id: number }>(h.app, "POST", "/api/v1/profiles", {
      headers,
      body: profileInput({ full_name: "Before Update" }),
    });
    await waitFor(() => storedEmbedding(created.body.id), { what: "the initial embedding" });

    await call(h.app, "PUT", `/api/v1/profiles/${created.body.id}`, {
      headers,
      body: profileInput({ full_name: "After Update" }),
    });

    await waitFor(
      async () => {
        const row = await storedEmbedding(created.body.id);
        return (row?.payload as ProfileOutput | undefined)?.full_name === "After Update"
          ? row
          : null;
      },
      { what: "the refreshed snapshot" }
    );
  });

  test("deleting a profile removes its vector", async () => {
    const user = await seedUser(h);
    const headers = await bearerAuth(h, user.id);

    const created = await call<{ id: number }>(h.app, "POST", "/api/v1/profiles", {
      headers,
      body: profileInput(),
    });
    await waitFor(() => storedEmbedding(created.body.id), { what: "the embedding row" });

    await call(h.app, "DELETE", `/api/v1/profiles/${created.body.id}`, { headers });

    await waitUntilGone(() => storedEmbedding(created.body.id), {
      what: "the embedding row to be removed",
    });
  });

  test("embeds the profile's flattened text, not just its name", async () => {
    const user = await seedUser(h);
    const headers = await bearerAuth(h, user.id);

    await call(h.app, "POST", "/api/v1/profiles", {
      headers,
      body: profileInput({
        full_name: "Grace Hopper",
        tags: [{ tag: "compilers" }],
        quotes: [{ quote: "dare and do" }],
      }),
    });

    const text = await waitFor(
      async () => h.embeddings!.calls.find((c) => c.includes("Grace Hopper")) ?? null,
      { what: "the embedding request" }
    );
    expect(text).toContain("Interests/Tags: compilers");
    expect(text).toContain("dare and do");
  });
});

describe("buildEmbeddingText", () => {
  const base: ProfileOutput = {
    id: 1,
    user_id: 1,
    full_name: "Test Person",
    pronouns: "",
    relationship_type: "Friend",
    bio: "",
    profession: "",
    long_term_goals: "",
    birthday: null,
    zodiac_sign: null,
    music_preference: "",
    favorite_movie: "",
    favorite_book: "",
    notes: "",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    tags: [],
    political_views: [],
    food_restrictions: [],
    movie_genres: [],
    book_genres: [],
    hangout_places: [],
    quotes: [],
    favorite_memories: [],
    top_songs: [],
    associated_song: null,
  };

  test("omits optional sections that are empty", () => {
    const text = buildEmbeddingText(base);
    expect(text).toContain("Profile of Test Person");
    expect(text).not.toContain("Pronouns:");
    expect(text).not.toContain("Interests/Tags:");
    expect(text).not.toContain("Birthday:");
  });

  test("formats the birthday as a readable date", () => {
    const text = buildEmbeddingText({ ...base, birthday: "1990-04-01", zodiac_sign: "Aries" });
    expect(text).toContain("Birthday: April 01, 1990");
    expect(text).toContain("Zodiac Sign: Aries");
  });

  test("includes every populated collection", () => {
    const text = buildEmbeddingText({
      ...base,
      pronouns: "she/her",
      tags: [{ id: 1, profile_id: 1, tag: "climbing" }],
      political_views: [{ id: 1, profile_id: 1, view: "green" }],
      food_restrictions: [{ id: 1, profile_id: 1, restriction: "vegan" }],
      movie_genres: [{ id: 1, profile_id: 1, genre: "noir" }],
      book_genres: [{ id: 1, profile_id: 1, genre: "scifi" }],
      hangout_places: [{ id: 1, profile_id: 1, place: "the pier" }],
      quotes: [{ id: 1, profile_id: 1, quote: "onwards" }],
      favorite_memories: [{ id: 1, profile_id: 1, memory: "the trip" }],
      top_songs: [{ id: 1, profile_id: 1, name: "Song", artist: "Artist" }],
      associated_song: { profile_id: 1, name: "Theme", artist: "Composer" },
    });

    expect(text).toContain("Pronouns: she/her");
    expect(text).toContain("Political Views: green");
    expect(text).toContain("Food Restrictions: vegan");
    expect(text).toContain("Favorite Movie Genres: noir");
    expect(text).toContain("Favorite Book Genres: scifi");
    expect(text).toContain("Favorite Hangout Places: the pier");
    expect(text).toContain("Top Songs: Song by Artist");
    expect(text).toContain("Associated Song: Theme by Composer");
    expect(text).toContain('Quotes: "onwards"');
    expect(text).toContain("Favorite Memories: the trip");
  });
});

describe("EmbeddingRepository", () => {
  test("ranks by cosine similarity and scopes to the owner", async () => {
    const repo = new EmbeddingRepository(h.db, h.runtime.logger);
    const owner = await seedUser(h, { email: "owner-rag@example.com" });
    const other = await seedUser(h, { email: "other-rag@example.com" });
    const headers = await bearerAuth(h, owner.id);

    const climber = await call<{ id: number }>(h.app, "POST", "/api/v1/profiles", {
      headers,
      body: profileInput({ full_name: "Climber Person", bio: "loves climbing granite" }),
    });
    const baker = await call<{ id: number }>(h.app, "POST", "/api/v1/profiles", {
      headers,
      body: profileInput({ full_name: "Baker Person", bio: "loves sourdough bread" }),
    });

    await waitFor(() => storedEmbedding(climber.body.id), { what: "climber embedding" });
    await waitFor(() => storedEmbedding(baker.body.id), { what: "baker embedding" });

    const query = await h.embeddings!.generateEmbedding("climbing granite");
    const results = await repo.searchContext(owner.id, query, 5);

    expect(results).toHaveLength(2);
    expect(results[0]!.profileId).toBe(climber.body.id);
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score);

    // Another user's search sees nothing, even with the same query vector.
    expect(await repo.searchContext(other.id, query, 5)).toHaveLength(0);
  });

  test("honours the result limit", async () => {
    const repo = new EmbeddingRepository(h.db, h.runtime.logger);
    const user = await seedUser(h, { email: "limit-rag@example.com" });
    const headers = await bearerAuth(h, user.id);

    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await call<{ id: number }>(h.app, "POST", "/api/v1/profiles", {
        headers,
        body: profileInput({ full_name: `Person ${i}` }),
      });
      ids.push(res.body.id);
    }
    for (const id of ids) {
      await waitFor(() => storedEmbedding(id), { what: `embedding ${id}` });
    }

    const query = await h.embeddings!.generateEmbedding("person");
    expect(await repo.searchContext(user.id, query, 2)).toHaveLength(2);
  });
});
