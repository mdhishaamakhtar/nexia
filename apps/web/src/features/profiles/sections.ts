/**
 * How a profile is laid out, once, for everywhere it appears: the page you
 * read, the form you edit and the PDF you save all show the same sections,
 * with the same titles, in this order.
 *
 * The order runs from what is quick to take in to what takes reading: their
 * music, what they like, how they live, then their words, your memories and
 * the longer notes.
 *
 * Name, pronouns, relationship and bio open all three, together with
 * `HEADER_FIELDS`; none of those belongs to a section.
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

/** Shown with the name at the top, not in a section of their own. */
export const HEADER_FIELDS = [
  "profession",
  "birthday",
  "tags",
] as const satisfies readonly ProfileFieldKey[];

export const PROFILE_SECTIONS = [
  { id: "song", title: "Their song", fields: ["associated_song"] },
  { id: "repeat", title: "On repeat", fields: ["top_songs", "music_preference"] },
  {
    id: "favorites",
    title: "Favorites",
    fields: ["favorite_movie", "favorite_book", "movie_genres", "book_genres"],
  },
  {
    id: "day",
    title: "Day to day",
    fields: ["hangout_places", "food_restrictions", "political_views"],
  },
  { id: "words", title: "In their words", fields: ["quotes"] },
  { id: "memories", title: "Memories together", fields: ["favorite_memories"] },
  { id: "dreams", title: "Dreams of", fields: ["long_term_goals"] },
  { id: "notes", title: "Notes", fields: ["notes"] },
] as const satisfies ReadonlyArray<{
  id: string;
  title: string;
  fields: readonly ProfileFieldKey[];
}>;

export type ProfileSectionDef = (typeof PROFILE_SECTIONS)[number];
export type ProfileSectionId = ProfileSectionDef["id"];

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
