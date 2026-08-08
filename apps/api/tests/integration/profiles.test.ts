import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import type { ProfileOutput, ProfileSummary } from "@nexia/shared";
import { profiles, tags, topSongs } from "../../src/db/schema";
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

describe("POST /profiles", () => {
  test("persists every child collection", async () => {
    const a = await actor();
    const id = await createProfile(
      a,
      profileInput({
        full_name: "Full House",
        bio: "a bio",
        tags: [{ tag: "climbing" }, { tag: "jazz" }],
        political_views: [{ view: "green" }],
        food_restrictions: [{ restriction: "vegetarian" }],
        movie_genres: [{ genre: "horror" }],
        book_genres: [{ genre: "scifi" }],
        hangout_places: [{ place: "the pier" }],
        quotes: [{ quote: "be excellent" }],
        favorite_memories: [{ memory: "the road trip" }],
        top_songs: [{ name: "One", artist: "A" }],
        associated_song: { name: "Theme", artist: "B" },
      })
    );

    const res = await getProfile(a, id);
    expect(res.status).toBe(200);
    expect(res.body.tags.map((t) => t.tag).sort()).toEqual(["climbing", "jazz"]);
    expect(res.body.political_views[0]!.view).toBe("green");
    expect(res.body.food_restrictions[0]!.restriction).toBe("vegetarian");
    expect(res.body.movie_genres[0]!.genre).toBe("horror");
    expect(res.body.book_genres[0]!.genre).toBe("scifi");
    expect(res.body.hangout_places[0]!.place).toBe("the pier");
    expect(res.body.quotes[0]!.quote).toBe("be excellent");
    expect(res.body.favorite_memories[0]!.memory).toBe("the road trip");
    expect(res.body.top_songs[0]!.name).toBe("One");
    expect(res.body.associated_song!.artist).toBe("B");
  });

  test("derives the zodiac sign from the birthday", async () => {
    const a = await actor();
    const id = await createProfile(a, profileInput({ birthday: "2001-11-22" }));
    expect((await getProfile(a, id)).body.zodiac_sign).toBe("Sagittarius");
  });

  test("ignores a client-supplied zodiac sign", async () => {
    const a = await actor();
    const id = await createProfile(a, profileInput({ birthday: "2001-11-22", zodiac_sign: "Leo" }));
    expect((await getProfile(a, id)).body.zodiac_sign).toBe("Sagittarius");
  });

  test("clears the zodiac sign when there is no birthday", async () => {
    const a = await actor();
    const id = await createProfile(a, profileInput({ zodiac_sign: "Leo" }));
    expect((await getProfile(a, id)).body.zodiac_sign).toBeNull();
  });

  test("rejects more than three top songs", async () => {
    const a = await actor();
    const res = await call(h.app, "POST", "/api/v1/profiles", {
      headers: a.headers,
      body: profileInput({
        top_songs: [
          { name: "1", artist: "A" },
          { name: "2", artist: "B" },
          { name: "3", artist: "C" },
          { name: "4", artist: "D" },
        ],
      }),
    });
    expect(res.status).toBe(400);
    expect(errorCode(res)).toBe("VALIDATION_ERROR");

    // The rejection must not have left a partial row behind.
    expect(await h.db.select().from(profiles)).toHaveLength(0);
  });

  test("rejects a missing full_name", async () => {
    const a = await actor();
    const res = await call(h.app, "POST", "/api/v1/profiles", {
      headers: a.headers,
      body: { relationship_type: "Friend" },
    });
    expect(res.status).toBe(400);
  });

  test("rejects an unknown relationship type", async () => {
    const a = await actor();
    const res = await call(h.app, "POST", "/api/v1/profiles", {
      headers: a.headers,
      body: { full_name: "X", relationship_type: "Nemesis" },
    });
    expect(res.status).toBe(400);
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

    const res = await call<{ data: ProfileSummary[]; total: number }>(
      h.app,
      "GET",
      "/api/v1/profiles",
      { headers: mine.headers }
    );
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0]!.full_name).toBe("Mine");
  });

  test("paginates", async () => {
    const a = await actor();
    for (let i = 0; i < 5; i++) {
      await createProfile(a, profileInput({ full_name: `Person ${i}` }));
    }

    const page1 = await call<{ data: ProfileSummary[]; total: number; page: number }>(
      h.app,
      "GET",
      "/api/v1/profiles?page=1&limit=2",
      { headers: a.headers }
    );
    expect(page1.body.total).toBe(5);
    expect(page1.body.data).toHaveLength(2);

    const page3 = await call<{ data: ProfileSummary[] }>(
      h.app,
      "GET",
      "/api/v1/profiles?page=3&limit=2",
      { headers: a.headers }
    );
    expect(page3.body.data).toHaveLength(1);
  });

  test("filters by name substring, case-insensitively", async () => {
    const a = await actor();
    await createProfile(a, profileInput({ full_name: "Alexander Hamilton" }));
    await createProfile(a, profileInput({ full_name: "Betty Ross" }));

    const res = await call<{ data: ProfileSummary[]; total: number }>(
      h.app,
      "GET",
      "/api/v1/profiles?search=hamil",
      { headers: a.headers }
    );
    expect(res.body.total).toBe(1);
    expect(res.body.data[0]!.full_name).toBe("Alexander Hamilton");
  });

  test("filters by relationship type", async () => {
    const a = await actor();
    await createProfile(a, profileInput({ full_name: "A", relationship_type: "Friend" }));
    await createProfile(a, profileInput({ full_name: "B", relationship_type: "Colleague" }));

    const res = await call<{ data: ProfileSummary[]; total: number }>(
      h.app,
      "GET",
      "/api/v1/profiles?relationship_type=Colleague",
      { headers: a.headers }
    );
    expect(res.body.total).toBe(1);
    expect(res.body.data[0]!.full_name).toBe("B");
  });

  test("returns the lean summary shape, with tags but no other collections", async () => {
    const a = await actor();
    await createProfile(
      a,
      profileInput({ tags: [{ tag: "hiking" }], quotes: [{ quote: "hidden" }] })
    );

    const res = await call<{ data: ProfileSummary[] }>(h.app, "GET", "/api/v1/profiles", {
      headers: a.headers,
    });
    const summary = res.body.data[0]!;
    expect(summary.tags[0]!.tag).toBe("hiking");
    expect(summary).not.toHaveProperty("quotes");
    expect(summary).not.toHaveProperty("bio");
  });

  test("rejects an invalid relationship_type filter", async () => {
    const a = await actor();
    const res = await call(h.app, "GET", "/api/v1/profiles?relationship_type=Nemesis", {
      headers: a.headers,
    });
    expect(res.status).toBe(400);
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

    const res = await getProfile(theirs, id);
    expect(res.status).toBe(404);
  });

  test("404s for a profile that does not exist", async () => {
    const a = await actor();
    expect((await getProfile(a, 999_999)).status).toBe(404);
  });

  test("400s for a non-numeric id", async () => {
    const a = await actor();
    const res = await call(h.app, "GET", "/api/v1/profiles/abc", { headers: a.headers });
    expect(res.status).toBe(400);
  });

  test("400s for a negative id", async () => {
    const a = await actor();
    const res = await call(h.app, "GET", "/api/v1/profiles/-1", { headers: a.headers });
    expect(res.status).toBe(400);
  });
});

describe("PUT /profiles/:id", () => {
  test("updates scalar fields", async () => {
    const a = await actor();
    const id = await createProfile(a, profileInput({ full_name: "Before", bio: "old bio" }));

    const res = await call(h.app, "PUT", `/api/v1/profiles/${id}`, {
      headers: a.headers,
      body: profileInput({ full_name: "After", bio: "new bio" }),
    });
    expect(res.status).toBe(200);

    const got = await getProfile(a, id);
    expect(got.body.full_name).toBe("After");
    expect(got.body.bio).toBe("new bio");
  });

  test("replaces child collections wholesale rather than appending", async () => {
    const a = await actor();
    const id = await createProfile(
      a,
      profileInput({ tags: [{ tag: "old-one" }, { tag: "old-two" }] })
    );

    await call(h.app, "PUT", `/api/v1/profiles/${id}`, {
      headers: a.headers,
      body: profileInput({ tags: [{ tag: "new-only" }] }),
    });

    const got = await getProfile(a, id);
    expect(got.body.tags.map((t) => t.tag)).toEqual(["new-only"]);
    // The replaced rows must actually be gone, not merely unreferenced.
    expect(await h.db.select().from(tags)).toHaveLength(1);
  });

  test("clears a child collection when given an empty array", async () => {
    const a = await actor();
    const id = await createProfile(a, profileInput({ tags: [{ tag: "temporary" }] }));

    await call(h.app, "PUT", `/api/v1/profiles/${id}`, {
      headers: a.headers,
      body: profileInput({ tags: [] }),
    });

    expect((await getProfile(a, id)).body.tags).toEqual([]);
  });

  test("overwrites omitted optional fields, since PUT replaces the resource", async () => {
    const a = await actor();
    const id = await createProfile(
      a,
      profileInput({
        full_name: "Kept",
        bio: "should be cleared",
        profession: "should also be cleared",
        birthday: "1990-04-01",
        tags: [{ tag: "should-be-cleared" }],
      })
    );

    // A PUT carrying only the required fields is a request to replace the
    // resource with exactly that — not to merge it over what is already stored.
    await call(h.app, "PUT", `/api/v1/profiles/${id}`, {
      headers: a.headers,
      body: { full_name: "Kept", relationship_type: "Friend" },
    });

    const got = await getProfile(a, id);
    expect(got.body.bio).toBe("");
    expect(got.body.profession).toBe("");
    expect(got.body.birthday).toBeNull();
    expect(got.body.zodiac_sign).toBeNull();
    expect(got.body.tags).toEqual([]);
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

  test("404s for another user's profile", async () => {
    const mine = await actor("puta@example.com");
    const theirs = await actor("putb@example.com");
    const id = await createProfile(mine, profileInput());

    const res = await call(h.app, "PUT", `/api/v1/profiles/${id}`, {
      headers: theirs.headers,
      body: profileInput({ full_name: "Hijacked" }),
    });
    expect(res.status).toBe(404);

    // And the original must be untouched.
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

  test("rejects more than three top songs", async () => {
    const a = await actor();
    const id = await createProfile(a, profileInput());
    const res = await call(h.app, "PUT", `/api/v1/profiles/${id}`, {
      headers: a.headers,
      body: profileInput({
        top_songs: [
          { name: "1", artist: "A" },
          { name: "2", artist: "B" },
          { name: "3", artist: "C" },
          { name: "4", artist: "D" },
        ],
      }),
    });
    expect(res.status).toBe(400);
    expect(await h.db.select().from(topSongs)).toHaveLength(0);
  });
});

describe("DELETE /profiles/:id", () => {
  test("removes the profile and cascades to its children", async () => {
    const a = await actor();
    const id = await createProfile(a, profileInput({ tags: [{ tag: "doomed" }] }));

    const res = await call(h.app, "DELETE", `/api/v1/profiles/${id}`, { headers: a.headers });
    expect(res.status).toBe(200);

    expect((await getProfile(a, id)).status).toBe(404);
    expect(await h.db.select().from(tags).where(eq(tags.profileId, id))).toHaveLength(0);
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
