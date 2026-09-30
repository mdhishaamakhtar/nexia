import type { TapeColor } from "@/components/atoms/Tape";

/**
 * The four sections a profile is kept in: their titles, their tape, and which
 * fields belong to each. The detail sheet, the form and the PDF export all
 * render from this list, so reading a profile and editing it are the same
 * document in two states — a field cannot sit in one section on the sheet and
 * another in the form, as genres and political views once did.
 *
 * The hero (name, pronouns, relationship, bio) sits above the sections and is
 * not listed here.
 */
export type ProfileFieldKey =
  | "profession"
  | "birthday"
  | "tags"
  | "favorite_movie"
  | "favorite_book"
  | "music_preference"
  | "associated_song"
  | "top_songs"
  | "movie_genres"
  | "book_genres"
  | "hangout_places"
  | "food_restrictions"
  | "political_views"
  | "long_term_goals"
  | "favorite_memories"
  | "notes"
  | "quotes";

export interface ProfileSectionDef {
  id: "overview" | "interests" | "lifestyle" | "deep";
  title: string;
  /** A surface tint — never a foreground. */
  tape: TapeColor;
  fields: readonly ProfileFieldKey[];
}

export const PROFILE_SECTIONS: readonly ProfileSectionDef[] = [
  {
    id: "overview",
    title: "Overview",
    tape: "lavender",
    fields: ["profession", "birthday", "tags"],
  },
  {
    id: "interests",
    title: "Favorites & interests",
    tape: "peach",
    fields: [
      "favorite_movie",
      "favorite_book",
      "music_preference",
      "associated_song",
      "top_songs",
      "movie_genres",
      "book_genres",
    ],
  },
  {
    id: "lifestyle",
    title: "Lifestyle",
    tape: "blue",
    fields: ["hangout_places", "food_restrictions", "political_views"],
  },
  {
    id: "deep",
    title: "Deep dive",
    tape: "lavender",
    fields: ["long_term_goals", "favorite_memories", "notes", "quotes"],
  },
];

export const FIELD_LABELS: Record<ProfileFieldKey, string> = {
  profession: "Profession",
  birthday: "Birthday",
  tags: "Tags",
  favorite_movie: "Favorite movie",
  favorite_book: "Favorite book",
  music_preference: "Music preference",
  associated_song: "Their song",
  top_songs: "Top songs",
  movie_genres: "Movie genres",
  book_genres: "Book genres",
  hangout_places: "Hangout places",
  food_restrictions: "Food restrictions",
  political_views: "Political views",
  long_term_goals: "Long-term goals",
  favorite_memories: "Favorite memories",
  notes: "Additional notes",
  quotes: "Their quotes",
};

/**
 * Rank tints for a top three: the one place three accents sit together,
 * because rank is the information. Each place also carries its number, so
 * colour is never the only code.
 */
export const RANK_TINTS = [
  "bg-lavender-soft border-lavender-line text-lavender-ink",
  "bg-peach-soft border-peach-line text-peach-ink",
  "bg-blue-soft border-blue-line text-blue-ink-deep",
] as const;

type Rgb = [number, number, number];

/** The token palette in RGB, for jsPDF, which cannot read CSS variables. */
export const PDF_TAPE: Record<TapeColor, { tape: Rgb; ink: Rgb; soft: Rgb }> = {
  peach: { tape: [253, 186, 116], ink: [124, 45, 18], soft: [255, 237, 213] },
  lavender: { tape: [196, 181, 253], ink: [91, 33, 182], soft: [237, 233, 254] },
  blue: { tape: [147, 197, 253], ink: [30, 64, 175], soft: [219, 234, 254] },
};
