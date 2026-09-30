import type { ProfileOutput, ProfileSummary } from "@nexia/shared";

/** A full profile as the API returns it, with nothing filled in beyond the name. */
export function makeProfile(overrides: Partial<ProfileOutput> = {}): ProfileOutput {
  return {
    id: 7,
    user_id: 1,
    full_name: "Asha Kumar",
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
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
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
    ...overrides,
  };
}

/** A profile with every section filled, for rendering everything at once. */
export function makeFullProfile(overrides: Partial<ProfileOutput> = {}): ProfileOutput {
  return makeProfile({
    pronouns: "she/her",
    relationship_type: "Classmate",
    bio: "Sat next to me in every lab.",
    profession: "Illustrator",
    long_term_goals: "Open a studio by the sea.",
    birthday: "1996-03-16",
    zodiac_sign: "Pisces",
    music_preference: "Anything with strings",
    favorite_movie: "Spirited Away",
    favorite_book: "The Hobbit",
    notes: "Allergic to cats.",
    tags: ["night owl", "chai person"],
    political_views: ["green"],
    food_restrictions: ["vegetarian"],
    movie_genres: ["animation"],
    book_genres: ["fantasy"],
    hangout_places: ["the old library"],
    quotes: ["If it scares you a little, it's probably worth doing."],
    favorite_memories: ["Getting caught in the monsoon on the way back from Lonavala."],
    top_songs: [
      { name: "Holocene", artist: "Bon Iver" },
      { name: "Yellow", artist: "Coldplay" },
      { name: "Liability", artist: "" },
    ],
    associated_song: { name: "Kun Faya Kun", artist: "A. R. Rahman" },
    ...overrides,
  });
}

export function makeSummary(overrides: Partial<ProfileSummary> = {}): ProfileSummary {
  return {
    id: 7,
    full_name: "Asha Kumar",
    pronouns: "",
    relationship_type: "Friend",
    zodiac_sign: null,
    tags: [],
    ...overrides,
  };
}
