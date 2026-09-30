import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import type { ProfileOutput } from "@nexia/shared";
import pino from "pino";
import { profileEmbeddings, profiles } from "../../src/db/schema";
import { EmbeddingRepository } from "../../src/repositories/embedding";
import { ProfileRepository } from "../../src/repositories/profile";
import { EmbeddingService, buildEmbeddingText } from "../../src/services/embedding-service";
import { EmbeddingWorker } from "../../src/services/embedding-worker";
import { createHarness, type Harness } from "../helpers/harness";
import { bearerAuth, call, profileInput, seedUser } from "../helpers/factories";
import { createFakeEmbeddingGenerator } from "../helpers/embeddings";
import { waitFor } from "../helpers/wait";

let h: Harness;

beforeAll(() => {
  h = createHarness();
});
afterAll(async () => {
  await h.close();
});

async function storedEmbedding(profileId: number) {
  const [row] = await h.db
    .select()
    .from(profileEmbeddings)
    .where(eq(profileEmbeddings.profileId, profileId));
  return row;
}

async function createProfile(headers: Record<string, string>, body: unknown): Promise<number> {
  const res = await call<{ id: number }>(h.app, "POST", "/api/v1/profiles", { headers, body });
  if (res.status !== 201) throw new Error(`create failed: ${res.status}`);
  return res.body.id;
}

describe("embedding pipeline", () => {
  test("a new profile is embedded at its current revision", async () => {
    const user = await seedUser(h);
    const id = await createProfile(
      await bearerAuth(h, user.id),
      profileInput({ full_name: "Ada Lovelace" })
    );
    expect(await storedEmbedding(id)).toBeUndefined();

    await h.embedPending();

    const row = await storedEmbedding(id);
    expect(row!.userId).toBe(user.id);
    expect(row!.embedding).toHaveLength(3072);
    expect(row!.sourceRevision).toBe(1);
  });

  test("an update marks the vector stale and the next pass refreshes it", async () => {
    const user = await seedUser(h);
    const headers = await bearerAuth(h, user.id);
    const id = await createProfile(headers, profileInput({ full_name: "Before Update" }));
    await h.embedPending();
    h.embeddings!.calls.length = 0;

    await call(h.app, "PUT", `/api/v1/profiles/${id}`, {
      headers,
      body: profileInput({ full_name: "After Update" }),
    });
    await h.embedPending();

    expect((await storedEmbedding(id))!.sourceRevision).toBe(2);
    expect(h.embeddings!.calls).toEqual([expect.stringContaining("After Update")]);
  });

  test("a profile that is up to date is not embedded again", async () => {
    const user = await seedUser(h);
    await createProfile(await bearerAuth(h, user.id), profileInput());
    await h.embedPending();
    h.embeddings!.calls.length = 0;

    await h.embedPending();
    expect(h.embeddings!.calls).toHaveLength(0);
  });

  test("deleting a profile takes its vector with it", async () => {
    const user = await seedUser(h);
    const headers = await bearerAuth(h, user.id);
    const id = await createProfile(headers, profileInput());
    await h.embedPending();

    await call(h.app, "DELETE", `/api/v1/profiles/${id}`, { headers });
    expect(await storedEmbedding(id)).toBeUndefined();
  });

  test("works through more stale profiles than fit in one batch", async () => {
    const user = await seedUser(h);
    const headers = await bearerAuth(h, user.id);
    for (let i = 0; i < 12; i++) await createProfile(headers, profileInput({ full_name: `P${i}` }));

    await h.embedPending();
    expect(await h.db.select().from(profileEmbeddings)).toHaveLength(12);
  });

  test("a provider failure backs that profile off without blocking the others", async () => {
    // Its own harness: back-off is remembered per profile id in memory, and ids
    // restart after every test's truncation.
    const own = createHarness();
    try {
      const user = await seedUser(own);
      const headers = await bearerAuth(own, user.id);
      const create = async (full_name: string) =>
        (
          await call<{ id: number }>(own.app, "POST", "/api/v1/profiles", {
            headers,
            body: profileInput({ full_name }),
          })
        ).body.id;
      const failing = await create("Fails First");
      const fine = await create("Works Fine");

      // The stale query returns the oldest first, so the first call is `failing`.
      own.embeddings!.failNext();
      await own.embedPending();

      expect(await storedEmbedding(failing)).toBeUndefined();
      expect(await storedEmbedding(fine)).toBeDefined();

      // Still in its back-off window: the next pass leaves it alone.
      own.embeddings!.calls.length = 0;
      await own.embedPending();
      expect(own.embeddings!.calls).toHaveLength(0);
    } finally {
      await own.close();
    }
  });

  test("an older vector never overwrites a newer one", async () => {
    const user = await seedUser(h);
    const id = await createProfile(await bearerAuth(h, user.id), profileInput());
    const repo = new EmbeddingRepository(h.db);
    const vector = await h.embeddings!.generateEmbedding("x");

    await repo.upsert({ profileId: id, userId: user.id, embedding: vector, revision: 5 });
    await repo.upsert({ profileId: id, userId: user.id, embedding: vector, revision: 3 });

    expect((await storedEmbedding(id))!.sourceRevision).toBe(5);
  });

  test("the running worker picks up a save without being asked", async () => {
    const service = new EmbeddingService(
      new EmbeddingRepository(h.db),
      createFakeEmbeddingGenerator(),
      pino({ level: "silent" })
    );
    const worker = new EmbeddingWorker(service, pino({ level: "silent" }), 60_000);
    const user = await seedUser(h);
    const [row] = await h.db
      .insert(profiles)
      .values({ userId: user.id, fullName: "Background", relationshipType: "Friend" })
      .returning({ id: profiles.id });

    worker.start();
    try {
      await waitFor(() => storedEmbedding(row!.id), { what: "the worker to embed the profile" });
    } finally {
      await worker.stop();
    }
  });
});

describe("semantic search", () => {
  test("ranks by similarity, answers from the live profile, and scopes to the owner", async () => {
    const owner = await seedUser(h, { email: "owner-rag@example.com" });
    const other = await seedUser(h, { email: "other-rag@example.com" });
    const headers = await bearerAuth(h, owner.id);

    const climber = await createProfile(
      headers,
      profileInput({ full_name: "Climber Person", bio: "loves climbing granite" })
    );
    const baker = await createProfile(
      headers,
      profileInput({ full_name: "Baker Person", bio: "loves sourdough bread" })
    );
    await h.embedPending();

    const service = h.runtime.embeddingService!;
    const hits = await service.search(owner.id, "climbing granite", 5);
    expect(hits.map((r) => r.profileId)).toEqual([climber, baker]);
    expect(hits[0]!.score).toBeGreaterThan(hits[1]!.score);

    expect(await service.search(other.id, "climbing granite", 5)).toHaveLength(0);
    expect(await service.search(owner.id, "anything", 1)).toHaveLength(1);
  });
});

describe("loading search hits", () => {
  test("no hits load no profiles", async () => {
    const user = await seedUser(h);
    expect(await new ProfileRepository(h.db).findByIds([], user.id)).toEqual([]);
  });

  test("hits keep their ranked order, and a vanished profile is skipped", async () => {
    const user = await seedUser(h);
    const headers = await bearerAuth(h, user.id);
    const first = await createProfile(headers, profileInput({ full_name: "First" }));
    const second = await createProfile(headers, profileInput({ full_name: "Second" }));

    const loaded = await new ProfileRepository(h.db).findByIds([second, 999_999, first], user.id);
    expect(loaded.map((p) => p.full_name)).toEqual(["Second", "First"]);
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

  test("leaves out every empty field", () => {
    expect(buildEmbeddingText(base)).toBe("Profile of Test Person\nRelationship: Friend");
  });

  test("formats the birthday without shifting it through a time zone", () => {
    const text = buildEmbeddingText({ ...base, birthday: "1990-04-01", zodiac_sign: "Aries" });
    expect(text).toContain("Birthday: April 1, 1990");
    expect(text).toContain("Zodiac sign: Aries");
  });

  test("includes every populated field", () => {
    const text = buildEmbeddingText({
      ...base,
      pronouns: "she/her",
      notes: "allergic to peanuts",
      tags: ["climbing", "jazz"],
      political_views: ["green"],
      food_restrictions: ["vegan"],
      movie_genres: ["noir"],
      book_genres: ["scifi"],
      hangout_places: ["the pier"],
      quotes: ["onwards"],
      favorite_memories: ["the trip", "the rain"],
      top_songs: [
        { name: "Song", artist: "Artist" },
        { name: "Untitled", artist: "" },
      ],
      associated_song: { name: "Theme", artist: "Composer" },
    });

    expect(text).toContain("Pronouns: she/her");
    expect(text).toContain("Notes: allergic to peanuts");
    expect(text).toContain("Interests and tags: climbing, jazz");
    expect(text).toContain("Political views: green");
    expect(text).toContain("Food restrictions: vegan");
    expect(text).toContain("Favorite movie genres: noir");
    expect(text).toContain("Favorite book genres: scifi");
    expect(text).toContain("Favorite hangout places: the pier");
    expect(text).toContain("Top songs: Song by Artist, Untitled");
    expect(text).toContain("Their song: Theme by Composer");
    expect(text).toContain('Quotes: "onwards"');
    expect(text).toContain("Favorite memories: the trip; the rain");
  });
});
