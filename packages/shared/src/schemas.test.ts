import { describe, expect, test } from "vitest";
import { relationshipTypeSchema, zodiacSignSchema } from "../src/enums";
import { errorResponseSchema } from "../src/errors";
import {
  emailSchema,
  signupRequestSchema,
  loginRequestSchema,
  resetPasswordRequestSchema,
  verifyEmailRequestSchema,
} from "../src/auth";
import {
  MAX_TOP_SONGS,
  PROFILE_LIST_LIMITS,
  PROFILE_TEXT_LIMITS,
  profileInputSchema,
  profileOutputSchema,
  listProfilesQuerySchema,
} from "../src/profile";
import {
  ragSearchInputSchema,
  searchProfilesInputSchema,
  updateProfileToolInputSchema,
} from "../src/chat";

const minimal = { full_name: "Asha Kumar", relationship_type: "Friend" as const };
const TOKEN = "a".repeat(64);

describe("enums", () => {
  test("relationship and zodiac enums reject unknown values", () => {
    expect(relationshipTypeSchema.parse("Friend")).toBe("Friend");
    expect(() => relationshipTypeSchema.parse("Stranger")).toThrow();
    expect(zodiacSignSchema.parse("Pisces")).toBe("Pisces");
    expect(() => zodiacSignSchema.parse("Unknown")).toThrow();
  });
});

describe("errors", () => {
  test("errorResponseSchema requires code and message", () => {
    expect(
      errorResponseSchema.parse({ error: { code: "NOT_FOUND", message: "x" } }).error.code
    ).toBe("NOT_FOUND");
    expect(() => errorResponseSchema.parse({ error: { code: "x" } })).toThrow();
  });
});

describe("auth schemas", () => {
  test("emails are trimmed and lower-cased", () => {
    expect(emailSchema.parse("  Asha.K@Example.COM ")).toBe("asha.k@example.com");
  });

  test("emails must be addresses", () => {
    expect(() => emailSchema.parse("a@b")).toThrow();
    expect(() => emailSchema.parse("not an email")).toThrow();
  });

  test("a new password needs eight characters; signing in does not", () => {
    expect(() => signupRequestSchema.parse({ email: "a@b.co", password: "1234567" })).toThrow();
    expect(signupRequestSchema.parse({ email: "a@b.co", password: "12345678" }).password).toBe(
      "12345678"
    );
    // Accounts made under the old six-character rule must still get in.
    expect(loginRequestSchema.parse({ email: "a@b.co", password: "123456" }).password).toBe(
      "123456"
    );
    expect(() => loginRequestSchema.parse({ email: "a@b.co", password: "" })).toThrow();
  });

  test("email tokens are 64 hex characters", () => {
    expect(verifyEmailRequestSchema.parse({ token: TOKEN }).token).toBe(TOKEN);
    expect(() => verifyEmailRequestSchema.parse({ token: "abc123" })).toThrow();
    expect(() =>
      resetPasswordRequestSchema.parse({ token: TOKEN, new_password: "short" })
    ).toThrow();
  });
});

describe("profile input", () => {
  test("accepts a minimal profile", () => {
    expect(profileInputSchema.parse(minimal)).toEqual(minimal);
  });

  test("rejects a blank name after trimming", () => {
    expect(() => profileInputSchema.parse({ ...minimal, full_name: "   " })).toThrow();
  });

  test("birthdays must be real calendar dates", () => {
    expect(profileInputSchema.parse({ ...minimal, birthday: "1990-05-15" }).birthday).toBe(
      "1990-05-15"
    );
    expect(profileInputSchema.parse({ ...minimal, birthday: null }).birthday).toBeNull();
    for (const bad of ["2024-13-45", "2023-02-29", "05/15/1990", ""]) {
      expect(() => profileInputSchema.parse({ ...minimal, birthday: bad }), bad).toThrow();
    }
  });

  test("text fields stop at their column size", () => {
    const max = PROFILE_TEXT_LIMITS.favorite_movie;
    expect(() =>
      profileInputSchema.parse({ ...minimal, favorite_movie: "x".repeat(max) })
    ).not.toThrow();
    expect(() =>
      profileInputSchema.parse({ ...minimal, favorite_movie: "x".repeat(max + 1) })
    ).toThrow();
  });

  test("list fields are trimmed strings with bounded length and count", () => {
    const parsed = profileInputSchema.parse({ ...minimal, tags: ["  kind ", "funny"] });
    expect(parsed.tags).toEqual(["kind", "funny"]);

    expect(() => profileInputSchema.parse({ ...minimal, tags: ["  "] })).toThrow();
    const { items, length } = PROFILE_LIST_LIMITS.quotes;
    expect(() =>
      profileInputSchema.parse({ ...minimal, quotes: ["x".repeat(length + 1)] })
    ).toThrow();
    expect(() =>
      profileInputSchema.parse({ ...minimal, quotes: Array.from({ length: items + 1 }, () => "q") })
    ).toThrow();
  });

  test("songs need a name; the artist is optional", () => {
    const parsed = profileInputSchema.parse({
      ...minimal,
      top_songs: [{ name: "Holocene" }],
      associated_song: { name: "Yellow", artist: "Coldplay" },
    });
    expect(parsed.top_songs).toEqual([{ name: "Holocene", artist: "" }]);
    expect(() => profileInputSchema.parse({ ...minimal, top_songs: [{ name: " " }] })).toThrow();
  });

  test(`at most ${MAX_TOP_SONGS} top songs`, () => {
    const songs = Array.from({ length: MAX_TOP_SONGS + 1 }, (_, i) => ({ name: `s${i}` }));
    expect(() => profileInputSchema.parse({ ...minimal, top_songs: songs })).toThrow();
  });

  test("unknown keys, including a client-supplied zodiac sign, are dropped", () => {
    const parsed = profileInputSchema.parse({ ...minimal, zodiac_sign: "Leo", id: 4 });
    expect(parsed).not.toHaveProperty("zodiac_sign");
    expect(parsed).not.toHaveProperty("id");
  });
});

describe("profile output and queries", () => {
  test("output lists are plain string arrays", () => {
    const output = profileOutputSchema.parse({
      id: 1,
      user_id: 42,
      full_name: "Asha Kumar",
      pronouns: "",
      relationship_type: "Friend",
      bio: "",
      profession: "",
      long_term_goals: "",
      birthday: "1990-05-15",
      zodiac_sign: "Taurus",
      music_preference: "",
      favorite_movie: "",
      favorite_book: "",
      notes: "",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      tags: ["kind"],
      political_views: [],
      food_restrictions: [],
      movie_genres: [],
      book_genres: [],
      hangout_places: [],
      quotes: [],
      favorite_memories: [],
      top_songs: [{ name: "Song", artist: "" }],
      associated_song: null,
    });
    expect(output.tags).toEqual(["kind"]);
  });

  test("list query coerces numbers, applies defaults and bounds", () => {
    expect(listProfilesQuerySchema.parse({})).toEqual({ page: 1, limit: 24 });
    expect(listProfilesQuerySchema.parse({ page: "3", limit: "20", search: " asha " })).toEqual({
      page: 3,
      limit: 20,
      search: "asha",
    });
    expect(() => listProfilesQuerySchema.parse({ limit: "101" })).toThrow();
    expect(() => listProfilesQuerySchema.parse({ page: "0" })).toThrow();
    expect(() => listProfilesQuerySchema.parse({ page: "1.5" })).toThrow();
  });
});

describe("chat tool schemas", () => {
  test("search defaults and relationship enum", () => {
    expect(searchProfilesInputSchema.parse({})).toEqual({ page: 1, limit: 10 });
    expect(() => searchProfilesInputSchema.parse({ relationship_type: "friends" })).toThrow();
    expect(ragSearchInputSchema.parse({ query: "jazz" }).limit).toBe(5);
    expect(() => ragSearchInputSchema.parse({ query: "  " })).toThrow();
  });

  test("updates accept any subset of the profile", () => {
    const parsed = updateProfileToolInputSchema.parse({ id: 1, profile: { tags: ["new"] } });
    expect(parsed.profile).toEqual({ tags: ["new"] });
  });
});
