import { describe, test, expect, beforeAll, afterAll } from "vitest";
import type { ProfileOutput, ProfileSummary } from "@nexia/shared";
import { PROFILE_TEXT_LIMITS } from "@nexia/shared";
import { profiles } from "../../src/db/schema";
import { createHarness, type Harness } from "../helpers/harness";
import { bearerAuth, call, errorCode, profileInput, seedUser } from "../helpers/factories";

let h: Harness;

beforeAll(() => {
  h = createHarness();
});
afterAll(async () => {
  await h.close();
});

interface Actor {
  id: number;
  headers: Record<string, string>;
}

async function actor(email?: string): Promise<Actor> {
  const user = await seedUser(h, email ? { email } : {});
  return { id: user.id, headers: await bearerAuth(h, user.id) };
}

async function createProfile(a: Actor, body: unknown): Promise<number> {
  const res = await call<{ id: number }>(h.app, "POST", "/api/v1/profiles", {
    headers: a.headers,
    body,
  });
  if (res.status !== 201)
    throw new Error(`create failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.id;
}

const getProfile = (a: Actor, id: number) =>
  call<ProfileOutput>(h.app, "GET", `/api/v1/profiles/${id}`, { headers: a.headers });

const list = (a: Actor, query = "") =>
  call<{ data: ProfileSummary[]; total: number; page: number; limit: number }>(
    h.app,
    "GET",
    `/api/v1/profiles${query}`,
    { headers: a.headers }
  );

describe("POST /profiles", () => {
  test("persists every list field, in the order given", async () => {
    const a = await actor();
    const id = await createProfile(
      a,
      profileInput({
        full_name: "Full House",
        bio: "a bio",
        tags: ["jazz", "climbing"],
        political_views: ["green"],
        food_restrictions: ["vegetarian"],
        movie_genres: ["horror"],
        book_genres: ["scifi"],
        hangout_places: ["the pier"],
        quotes: ["be excellent"],
        favorite_memories: ["the road trip"],
        top_songs: [
          { name: "Third", artist: "C" },
          { name: "First", artist: "A" },
          { name: "Second" },
        ],
        associated_song: { name: "Theme", artist: "B" },
      })
    );

    const { status, body } = await getProfile(a, id);
    expect(status).toBe(200);
    expect(body.tags).toEqual(["jazz", "climbing"]);
    expect(body.political_views).toEqual(["green"]);
    expect(body.food_restrictions).toEqual(["vegetarian"]);
    expect(body.movie_genres).toEqual(["horror"]);
    expect(body.book_genres).toEqual(["scifi"]);
    expect(body.hangout_places).toEqual(["the pier"]);
    expect(body.quotes).toEqual(["be excellent"]);
    expect(body.favorite_memories).toEqual(["the road trip"]);
    // Rank is the whole point of a top three: the order must survive.
    expect(body.top_songs).toEqual([
      { name: "Third", artist: "C" },
      { name: "First", artist: "A" },
      { name: "Second", artist: "" },
    ]);
    expect(body.associated_song).toEqual({ name: "Theme", artist: "B" });
  });

  test("trims text and list entries", async () => {
    const a = await actor();
    const id = await createProfile(
      a,
      profileInput({ full_name: "  Padded  ", tags: ["  spaced out "] })
    );
    const { body } = await getProfile(a, id);
    expect(body.full_name).toBe("Padded");
    expect(body.tags).toEqual(["spaced out"]);
  });

  test("derives the zodiac sign from the birthday and ignores one sent by the client", async () => {
    const a = await actor();
    const id = await createProfile(a, {
      ...profileInput({ birthday: "2001-11-22" }),
      zodiac_sign: "Leo",
    });
    expect((await getProfile(a, id)).body.zodiac_sign).toBe("Sagittarius");

    const noBirthday = await createProfile(a, { ...profileInput(), zodiac_sign: "Leo" });
    expect((await getProfile(a, noBirthday)).body.zodiac_sign).toBeNull();
  });

  // Each of these used to reach Postgres and come back as a 500 carrying the
  // failed SQL. They are the schema's job now, answered with a 400.
  test.each([
    [
      "an over-long favorite movie",
      { favorite_movie: "x".repeat(PROFILE_TEXT_LIMITS.favorite_movie + 1) },
    ],
    ["an over-long profession", { profession: "x".repeat(PROFILE_TEXT_LIMITS.profession + 1) }],
    ["an impossible date", { birthday: "2024-13-45" }],
    ["a 29 February in a common year", { birthday: "2023-02-29" }],
    ["an empty tag", { tags: [" "] }],
    ["more than three top songs", { top_songs: [1, 2, 3, 4].map((n) => ({ name: `s${n}` })) }],
    ["a song without a name", { top_songs: [{ name: "", artist: "Someone" }] }],
    ["a missing full name", { full_name: "" }],
    ["an unknown relationship type", { relationship_type: "Nemesis" }],
  ])("rejects %s with a 400 and saves nothing", async (_label, override) => {
    const a = await actor();
    const res = await call<{ error: { message: string } }>(h.app, "POST", "/api/v1/profiles", {
      headers: a.headers,
      body: { ...profileInput(), ...override },
    });
    expect(res.status).toBe(400);
    expect(errorCode(res)).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).not.toContain("Failed query");
    expect(await h.db.select().from(profiles)).toHaveLength(0);
  });

  test("rejects a JSON body that is not an object", async () => {
    const a = await actor();
    const res = await call<{ error: { message: string } }>(h.app, "POST", "/api/v1/profiles", {
      headers: a.headers,
      body: ["not", "an", "object"],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/expected object/i);
  });

  test("rejects a body that is not JSON", async () => {
    const a = await actor();
    const res = await h.app.request("/api/v1/profiles", {
      method: "POST",
      headers: { ...a.headers, "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });

  test("rejects an oversized body with a 413", async () => {
    const a = await actor();
    const res = await call(h.app, "POST", "/api/v1/profiles", {
      headers: a.headers,
      body: { ...profileInput(), notes: "x".repeat(300 * 1024) },
    });
    expect(res.status).toBe(413);
    expect(errorCode(res)).toBe("PAYLOAD_TOO_LARGE");
  });

  test("requires authentication", async () => {
    const res = await call(h.app, "POST", "/api/v1/profiles", { body: profileInput() });
    expect(res.status).toBe(401);
  });
});

describe("GET /profiles", () => {
  test("returns only the caller's own profiles", async () => {
    const mine = await actor("mine@example.com");
    const theirs = await actor("theirs@example.com");
    await createProfile(mine, profileInput({ full_name: "Mine" }));
    await createProfile(theirs, profileInput({ full_name: "Theirs" }));

    const res = await list(mine);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0]!.full_name).toBe("Mine");
  });

  test("lists alphabetically, ignoring case, and pages stably", async () => {
    const a = await actor();
    for (const name of ["charlie", "Alice", "bob", "Dana", "eve"]) {
      await createProfile(a, profileInput({ full_name: name }));
    }

    const page1 = await list(a, "?page=1&limit=2");
    expect(page1.body.total).toBe(5);
    expect(page1.body.data.map((p) => p.full_name)).toEqual(["Alice", "bob"]);

    const page3 = await list(a, "?page=3&limit=2");
    expect(page3.body.data.map((p) => p.full_name)).toEqual(["eve"]);
  });

  test("defaults the page size", async () => {
    const a = await actor();
    const res = await list(a);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(24);
  });

  test("filters by name substring, case-insensitively", async () => {
    const a = await actor();
    await createProfile(a, profileInput({ full_name: "Alexander Hamilton" }));
    await createProfile(a, profileInput({ full_name: "Betty Ross" }));

    const res = await list(a, "?search=HAMIL");
    expect(res.body.total).toBe(1);
    expect(res.body.data[0]!.full_name).toBe("Alexander Hamilton");
  });

  test("treats % and _ in a search as literal characters", async () => {
    const a = await actor();
    await createProfile(a, profileInput({ full_name: "100% Sure" }));
    await createProfile(a, profileInput({ full_name: "Plain Name" }));

    expect((await list(a, "?search=%25")).body.data.map((p) => p.full_name)).toEqual(["100% Sure"]);
    expect((await list(a, "?search=_")).body.total).toBe(0);
  });

  test("filters by relationship type", async () => {
    const a = await actor();
    await createProfile(a, profileInput({ full_name: "A", relationship_type: "Friend" }));
    await createProfile(a, profileInput({ full_name: "B", relationship_type: "Colleague" }));

    const res = await list(a, "?relationship_type=Colleague");
    expect(res.body.total).toBe(1);
    expect(res.body.data[0]!.full_name).toBe("B");
  });

  test("returns the lean summary shape, with tags and the derived sign", async () => {
    const a = await actor();
    await createProfile(
      a,
      profileInput({ tags: ["hiking"], quotes: ["hidden"], birthday: "1998-03-14" })
    );

    const summary = (await list(a)).body.data[0]!;
    expect(summary.tags).toEqual(["hiking"]);
    expect(summary.zodiac_sign).toBe("Pisces");
    expect(summary).not.toHaveProperty("quotes");
    expect(summary).not.toHaveProperty("bio");
  });

  test.each([
    ["an unknown relationship type", "?relationship_type=Nemesis"],
    ["a page below 1", "?page=0"],
    ["a fractional page", "?page=1.5"],
    ["a limit above 100", "?limit=101"],
  ])("rejects %s", async (_label, query) => {
    const a = await actor();
    expect((await list(a, query)).status).toBe(400);
  });

  test("requires authentication", async () => {
    const res = await call(h.app, "GET", "/api/v1/profiles");
    expect(res.status).toBe(401);
  });
});

describe("GET /profiles/:id", () => {
  test("404s for another user's profile", async () => {
    const mine = await actor("owner@example.com");
    const theirs = await actor("stranger@example.com");
    const id = await createProfile(mine, profileInput());

    expect((await getProfile(theirs, id)).status).toBe(404);
  });

  test.each(["999999", "abc", "-1", "1.5"])("404s for id %s", async (raw) => {
    const a = await actor();
    const res = await call(h.app, "GET", `/api/v1/profiles/${raw}`, { headers: a.headers });
    expect(res.status).toBe(404);
  });
});

describe("PUT /profiles/:id", () => {
  test("replaces the profile and returns it", async () => {
    const a = await actor();
    const id = await createProfile(
      a,
      profileInput({ full_name: "Before", bio: "old bio", tags: ["a", "b"] })
    );

    const res = await call<ProfileOutput>(h.app, "PUT", `/api/v1/profiles/${id}`, {
      headers: a.headers,
      body: profileInput({ full_name: "After", bio: "new bio", tags: ["c"] }),
    });
    expect(res.status).toBe(200);
    expect(res.body.full_name).toBe("After");
    expect(res.body.tags).toEqual(["c"]);
    expect((await getProfile(a, id)).body.bio).toBe("new bio");
  });

  test("clears every omitted field, since PUT replaces the resource", async () => {
    const a = await actor();
    const id = await createProfile(
      a,
      profileInput({
        bio: "should be cleared",
        profession: "should also be cleared",
        birthday: "1990-04-01",
        tags: ["should-be-cleared"],
        top_songs: [{ name: "gone" }],
        associated_song: { name: "gone too" },
      })
    );

    await call(h.app, "PUT", `/api/v1/profiles/${id}`, {
      headers: a.headers,
      body: { full_name: "Kept", relationship_type: "Friend" },
    });

    const { body } = await getProfile(a, id);
    expect(body.full_name).toBe("Kept");
    expect(body.bio).toBe("");
    expect(body.profession).toBe("");
    expect(body.birthday).toBeNull();
    expect(body.zodiac_sign).toBeNull();
    expect(body.tags).toEqual([]);
    expect(body.top_songs).toEqual([]);
    expect(body.associated_song).toBeNull();
  });

  test("re-derives the zodiac when the birthday changes", async () => {
    const a = await actor();
    const id = await createProfile(a, profileInput({ birthday: "2001-11-22" }));

    await call(h.app, "PUT", `/api/v1/profiles/${id}`, {
      headers: a.headers,
      body: profileInput({ birthday: "1990-04-01" }),
    });

    expect((await getProfile(a, id)).body.zodiac_sign).toBe("Aries");
  });

  test("bumps the revision, which is what marks the embedding stale", async () => {
    const a = await actor();
    const id = await createProfile(a, profileInput());
    const [before] = await h.db.select({ revision: profiles.revision }).from(profiles);

    await call(h.app, "PUT", `/api/v1/profiles/${id}`, {
      headers: a.headers,
      body: profileInput(),
    });

    const [after] = await h.db.select({ revision: profiles.revision }).from(profiles);
    expect(after!.revision).toBe(before!.revision + 1);
  });

  test("404s for another user's profile and leaves it untouched", async () => {
    const mine = await actor("puta@example.com");
    const theirs = await actor("putb@example.com");
    const id = await createProfile(mine, profileInput());

    const res = await call(h.app, "PUT", `/api/v1/profiles/${id}`, {
      headers: theirs.headers,
      body: profileInput({ full_name: "Hijacked" }),
    });
    expect(res.status).toBe(404);
    expect((await getProfile(mine, id)).body.full_name).toBe("Alice Example");
  });

  test("404s for a profile that does not exist", async () => {
    const a = await actor();
    const res = await call(h.app, "PUT", "/api/v1/profiles/999999", {
      headers: a.headers,
      body: profileInput(),
    });
    expect(res.status).toBe(404);
  });

  test("validates like create", async () => {
    const a = await actor();
    const id = await createProfile(a, profileInput());
    const res = await call(h.app, "PUT", `/api/v1/profiles/${id}`, {
      headers: a.headers,
      body: profileInput({ birthday: "not-a-date" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /profiles/:id", () => {
  test("removes the profile", async () => {
    const a = await actor();
    const id = await createProfile(a, profileInput({ tags: ["doomed"] }));

    const res = await call(h.app, "DELETE", `/api/v1/profiles/${id}`, { headers: a.headers });
    expect(res.status).toBe(200);
    expect((await getProfile(a, id)).status).toBe(404);
  });

  test("404s for a profile that does not exist", async () => {
    const a = await actor();
    const res = await call(h.app, "DELETE", "/api/v1/profiles/999999", { headers: a.headers });
    expect(res.status).toBe(404);
  });

  test("404s for another user's profile, and leaves it intact", async () => {
    const mine = await actor("dela@example.com");
    const theirs = await actor("delb@example.com");
    const id = await createProfile(mine, profileInput());

    const res = await call(h.app, "DELETE", `/api/v1/profiles/${id}`, { headers: theirs.headers });
    expect(res.status).toBe(404);
    expect((await getProfile(mine, id)).status).toBe(200);
  });
});
