import { describe, expect, test } from "bun:test";
import { relationshipTypeSchema, zodiacSignSchema } from "../src/enums";
import { errorResponseSchema } from "../src/errors";
import {
  signupRequestSchema,
  loginRequestSchema,
  messageResponseSchema,
  loginResponseSchema,
  authSessionSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
} from "../src/auth";
import {
  profileInputSchema,
  profileOutputSchema,
  topSongSchema,
  associatedSongSchema,
  listProfilesQuerySchema,
  profileListResponseSchema,
} from "../src/profile";
import {
  ragSearchInputSchema,
  searchProfilesInputSchema,
  getProfileInputSchema,
  createProfileToolInputSchema,
  updateProfileToolInputSchema,
} from "../src/chat";

describe("enums", () => {
  test("relationshipTypeSchema accepts valid values", () => {
    expect(relationshipTypeSchema.parse("Friend")).toBe("Friend");
    expect(relationshipTypeSchema.parse("Family")).toBe("Family");
    expect(relationshipTypeSchema.parse("Other")).toBe("Other");
  });

  test("relationshipTypeSchema rejects invalid values", () => {
    expect(() => relationshipTypeSchema.parse("Stranger")).toThrow();
    expect(() => relationshipTypeSchema.parse("")).toThrow();
  });

  test("zodiacSignSchema accepts valid values", () => {
    expect(zodiacSignSchema.parse("Aries")).toBe("Aries");
    expect(zodiacSignSchema.parse("Pisces")).toBe("Pisces");
  });

  test("zodiacSignSchema rejects invalid values", () => {
    expect(() => zodiacSignSchema.parse("Unknown")).toThrow();
  });

  test("birthday format validation", () => {
    const birthdaySchema = profileInputSchema.shape.birthday;
    // Valid birthday
    const valid = profileInputSchema.parse({
      full_name: "Test",
      relationship_type: "Friend",
      birthday: "1990-05-15",
    });
    expect(valid.birthday).toBe("1990-05-15");

    // Null birthday
    const nullBirthday = profileInputSchema.parse({
      full_name: "Test",
      relationship_type: "Friend",
      birthday: null,
    });
    expect(nullBirthday.birthday).toBeNull();

    // Undefined birthday
    const undefBirthday = profileInputSchema.parse({
      full_name: "Test",
      relationship_type: "Friend",
    });
    expect(undefBirthday.birthday).toBeUndefined();

    // Invalid birthday format
    expect(() =>
      profileInputSchema.parse({
        full_name: "Test",
        relationship_type: "Friend",
        birthday: "05/15/1990",
      })
    ).toThrow();
  });
});

describe("errors", () => {
  test("errorResponseSchema parses valid error", () => {
    const result = errorResponseSchema.parse({
      error: { code: "NOT_FOUND", message: "Profile not found" },
    });
    expect(result.error.code).toBe("NOT_FOUND");
    expect(result.error.message).toBe("Profile not found");
  });

  test("errorResponseSchema rejects missing fields", () => {
    expect(() => errorResponseSchema.parse({ error: { code: "x" } })).toThrow();
  });
});

describe("auth schemas", () => {
  test("signupRequestSchema requires email and password", () => {
    const valid = signupRequestSchema.parse({
      email: "test@example.com",
      password: "password123",
    });
    expect(valid.email).toBe("test@example.com");
    expect(valid.password).toBe("password123");
  });

  test("signupRequestSchema rejects missing fields", () => {
    expect(() => signupRequestSchema.parse({ email: "x@y.z" })).toThrow();
    expect(() => signupRequestSchema.parse({ password: "123456" })).toThrow();
  });

  test("loginRequestSchema", () => {
    expect(() =>
      loginRequestSchema.parse({ email: "test@test.com", password: "123456" })
    ).not.toThrow();
  });

  test("forgotPasswordRequestSchema", () => {
    const valid = forgotPasswordRequestSchema.parse({ email: "test@test.com" });
    expect(valid.email).toBe("test@test.com");
  });

  test("resetPasswordRequestSchema", () => {
    const valid = resetPasswordRequestSchema.parse({
      token: "abc123",
      new_password: "newpass123",
    });
    expect(valid.token).toBe("abc123");
  });

  test("messageResponseSchema", () => {
    const valid = messageResponseSchema.parse({ message: "Done" });
    expect(valid.message).toBe("Done");
  });

  test("loginResponseSchema", () => {
    const valid = loginResponseSchema.parse({ token: "jwt..." });
    expect(valid.token).toBe("jwt...");
  });

  test("authSessionSchema", () => {
    const valid = authSessionSchema.parse({
      authenticated: true,
      user_id: 42,
    });
    expect(valid.authenticated).toBe(true);
    expect(valid.user_id).toBe(42);
  });
});

describe("profile schemas", () => {
  const minimalProfile = {
    full_name: "Asha Kumar",
    relationship_type: "Friend" as const,
  };

  test("profileInputSchema accepts minimal profile", () => {
    const result = profileInputSchema.parse(minimalProfile);
    expect(result.full_name).toBe("Asha Kumar");
    expect(result.relationship_type).toBe("Friend");
  });

  test("profileInputSchema rejects missing full_name", () => {
    expect(() => profileInputSchema.parse({ relationship_type: "Friend" })).toThrow();
  });

  test("profileInputSchema rejects invalid relationship_type", () => {
    expect(() =>
      profileInputSchema.parse({ full_name: "Test", relationship_type: "Boss" })
    ).toThrow();
  });

  test("profileInputSchema accepts full profile with children", () => {
    const full = {
      full_name: "Asha Kumar",
      relationship_type: "Friend" as const,
      bio: "A great friend",
      profession: "Engineer",
      long_term_goals: "Travel the world",
      birthday: "1990-06-15",
      zodiac_sign: "Gemini" as const,
      music_preference: "Pop",
      favorite_movie: "Inception",
      favorite_book: "Dune",
      favorite_memory: "Road trip",
      notes: "Awesome person",
      tags: [{ tag: "kind" }, { tag: "funny" }],
      political_views: [{ view: "moderate" }],
      food_restrictions: [{ restriction: "vegetarian" }],
      movie_genres: [{ genre: "sci-fi" }],
      book_genres: [{ genre: "fiction" }],
      hangout_places: [{ place: "coffee shop" }],
      quotes: [{ quote: "Be yourself" }],
      top_songs: [
        { name: "Song 1", artist: "Artist 1" },
        { name: "Song 2", artist: "Artist 2" },
        { name: "Song 3", artist: "Artist 3" },
      ],
      associated_song: { name: "Anthem", artist: "Band" },
    };
    const result = profileInputSchema.parse(full);
    expect(result.tags?.length).toBe(2);
    expect(result.top_songs?.length).toBe(3);
    expect(result.associated_song?.name).toBe("Anthem");
  });

  test("topSongSchema validates name and artist", () => {
    const valid = topSongSchema.parse({
      name: "Bohemian Rhapsody",
      artist: "Queen",
    });
    expect(valid.name).toBe("Bohemian Rhapsody");
    expect(valid.artist).toBe("Queen");
  });

  test("topSongSchema rejects missing name", () => {
    expect(() => topSongSchema.parse({ artist: "Queen" })).toThrow();
  });

  test("associatedSongSchema", () => {
    const valid = associatedSongSchema.parse({
      name: "Anthem",
      artist: "Band",
    });
    expect(valid.name).toBe("Anthem");
  });

  test("profileOutputSchema requires all fields present", () => {
    const output = {
      id: 1,
      user_id: 42,
      full_name: "Asha Kumar",
      relationship_type: "Friend",
      bio: "",
      profession: "",
      long_term_goals: "",
      birthday: null,
      zodiac_sign: null,
      music_preference: "",
      favorite_movie: "",
      favorite_book: "",
      favorite_memory: "",
      notes: "",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      tags: [],
      political_views: [],
      food_restrictions: [],
      movie_genres: [],
      book_genres: [],
      hangout_places: [],
      quotes: [],
      top_songs: [],
      associated_song: null,
    };
    const result = profileOutputSchema.parse(output);
    expect(result.id).toBe(1);
  });

  test("listProfilesQuerySchema coerces page/limit", () => {
    const result = listProfilesQuerySchema.parse({
      page: "3",
      limit: "20",
      search: "asha",
      relationship_type: "Friend",
    });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(20);
    expect(result.search).toBe("asha");
  });

  test("profileListResponseSchema", () => {
    const response = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    };
    const result = profileListResponseSchema.parse(response);
    expect(result.total).toBe(0);
  });
});

describe("chat schemas", () => {
  test("ragSearchInputSchema", () => {
    const result = ragSearchInputSchema.parse({ query: "favorite movies" });
    expect(result.query).toBe("favorite movies");
    expect(result.limit).toBe(5);
  });

  test("ragSearchInputSchema with custom limit", () => {
    const result = ragSearchInputSchema.parse({ query: "test", limit: 3 });
    expect(result.limit).toBe(3);
  });

  test("searchProfilesInputSchema defaults", () => {
    const result = searchProfilesInputSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  test("getProfileInputSchema requires id", () => {
    const result = getProfileInputSchema.parse({ id: 5 });
    expect(result.id).toBe(5);
    expect(() => getProfileInputSchema.parse({})).toThrow();
  });

  test("createProfileToolInputSchema", () => {
    const result = createProfileToolInputSchema.parse({
      full_name: "New Person",
      relationship_type: "Colleague",
    });
    expect(result.full_name).toBe("New Person");
  });

  test("updateProfileToolInputSchema", () => {
    const result = updateProfileToolInputSchema.parse({
      id: 1,
      profile: { full_name: "Updated", relationship_type: "Friend" },
    });
    expect(result.id).toBe(1);
    expect(result.profile.full_name).toBe("Updated");
  });
});
