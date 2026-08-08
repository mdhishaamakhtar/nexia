import { describe, test, expect } from "vitest";
import {
  emptyChildren,
  toProfileOutput,
  toProfileSummary,
  type ProfileChildren,
} from "./profile-mapper";
import type { profiles } from "../db/schema";

type ProfileRow = typeof profiles.$inferSelect;

const CREATED = new Date("2026-01-02T03:04:05.000Z");

/**
 * Every nullable column set to NULL. Postgres allows this for all of them, so
 * the mapper's `?? ""` fallbacks are reachable in production — they just never
 * fire for a profile created through the API, which fills most fields in.
 */
function nullRow(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: 7,
    userId: 3,
    fullName: "Nulls Everywhere",
    pronouns: null,
    bio: null,
    profession: null,
    longTermGoals: null,
    relationshipType: "Friend",
    birthday: null,
    zodiacSign: null,
    musicPreference: null,
    favoriteMovie: null,
    favoriteBook: null,
    notes: "",
    createdAt: CREATED,
    updatedAt: CREATED,
    ...overrides,
  };
}

function fullRow(): ProfileRow {
  return nullRow({
    pronouns: "she/her",
    bio: "a bio",
    profession: "engineer",
    longTermGoals: "sail somewhere",
    birthday: "1990-04-01",
    zodiacSign: "Aries",
    musicPreference: "jazz",
    favoriteMovie: "Arrival",
    favoriteBook: "Piranesi",
    notes: "some notes",
  });
}

describe("toProfileOutput", () => {
  test("collapses every nullable column to the contract's empty string", () => {
    const out = toProfileOutput(nullRow(), emptyChildren());

    expect(out.pronouns).toBe("");
    expect(out.bio).toBe("");
    expect(out.profession).toBe("");
    expect(out.long_term_goals).toBe("");
    expect(out.music_preference).toBe("");
    expect(out.favorite_movie).toBe("");
    expect(out.favorite_book).toBe("");
    expect(out.notes).toBe("");
    expect(out.birthday).toBeNull();
    expect(out.zodiac_sign).toBeNull();
    expect(out.associated_song).toBeNull();
  });

  test("passes through populated columns unchanged", () => {
    const out = toProfileOutput(fullRow(), emptyChildren());

    expect(out.pronouns).toBe("she/her");
    expect(out.bio).toBe("a bio");
    expect(out.profession).toBe("engineer");
    expect(out.long_term_goals).toBe("sail somewhere");
    expect(out.music_preference).toBe("jazz");
    expect(out.favorite_movie).toBe("Arrival");
    expect(out.favorite_book).toBe("Piranesi");
    expect(out.notes).toBe("some notes");
    expect(out.birthday).toBe("1990-04-01");
    expect(out.zodiac_sign).toBe("Aries");
  });

  test("serialises timestamps as ISO strings", () => {
    const out = toProfileOutput(nullRow(), emptyChildren());
    expect(out.created_at).toBe("2026-01-02T03:04:05.000Z");
    expect(out.updated_at).toBe("2026-01-02T03:04:05.000Z");
  });

  test("collapses null values inside every child collection", () => {
    const children: ProfileChildren = {
      tags: [{ id: 1, profileId: 7, tag: null }],
      politicalViews: [{ id: 2, profileId: 7, view: null }],
      foodRestrictions: [{ id: 3, profileId: 7, restriction: null }],
      movieGenres: [{ id: 4, profileId: 7, genre: null }],
      bookGenres: [{ id: 5, profileId: 7, genre: null }],
      hangoutPlaces: [{ id: 6, profileId: 7, place: null }],
      quotes: [{ id: 7, profileId: 7, quote: null }],
      favoriteMemories: [{ id: 8, profileId: 7, memory: null }],
      topSongs: [{ id: 9, profileId: 7, name: null, artist: null }],
      associatedSong: { profileId: 7, name: null, artist: null },
    };

    const out = toProfileOutput(nullRow(), children);

    expect(out.tags[0]!.tag).toBe("");
    expect(out.political_views[0]!.view).toBe("");
    expect(out.food_restrictions[0]!.restriction).toBe("");
    expect(out.movie_genres[0]!.genre).toBe("");
    expect(out.book_genres[0]!.genre).toBe("");
    expect(out.hangout_places[0]!.place).toBe("");
    expect(out.quotes[0]!.quote).toBe("");
    expect(out.favorite_memories[0]!.memory).toBe("");
    expect(out.top_songs[0]!.name).toBe("");
    expect(out.top_songs[0]!.artist).toBe("");
    expect(out.associated_song!.name).toBe("");
    expect(out.associated_song!.artist).toBe("");
  });

  test("preserves populated child values", () => {
    const children: ProfileChildren = {
      ...emptyChildren(),
      tags: [{ id: 1, profileId: 7, tag: "climbing" }],
      topSongs: [{ id: 9, profileId: 7, name: "Song", artist: "Artist" }],
      associatedSong: { profileId: 7, name: "Theme", artist: "Composer" },
    };

    const out = toProfileOutput(nullRow(), children);
    expect(out.tags[0]!.tag).toBe("climbing");
    expect(out.top_songs[0]).toMatchObject({ name: "Song", artist: "Artist" });
    expect(out.associated_song).toMatchObject({ name: "Theme", artist: "Composer" });
  });
});

describe("toProfileSummary", () => {
  test("collapses null pronouns and zodiac", () => {
    const summary = toProfileSummary({
      id: 7,
      relationshipType: "Colleague",
      zodiacSign: null,
      fullName: "Lean Row",
      pronouns: null,
      tags: [{ id: 1, profileId: 7, tag: null }],
    });

    expect(summary.pronouns).toBe("");
    expect(summary.zodiac_sign).toBeNull();
    expect(summary.tags[0]!.tag).toBe("");
  });

  test("passes populated values through", () => {
    const summary = toProfileSummary({
      id: 7,
      relationshipType: "Friend",
      zodiacSign: "Leo",
      fullName: "Lean Row",
      pronouns: "they/them",
      tags: [{ id: 1, profileId: 7, tag: "chess" }],
    });

    expect(summary.pronouns).toBe("they/them");
    expect(summary.zodiac_sign).toBe("Leo");
    expect(summary.tags[0]!.tag).toBe("chess");
  });
});

describe("emptyChildren", () => {
  test("returns every collection empty and the has-one null", () => {
    const children = emptyChildren();
    expect(
      Object.values(children)
        .filter(Array.isArray)
        .every((c) => c.length === 0)
    ).toBe(true);
    expect(children.associatedSong).toBeNull();
  });
});
