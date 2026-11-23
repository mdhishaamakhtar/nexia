/**
 * The four sections the profile form is laid out in: their titles and which
 * fields belong to each.
 *
 * The profile page and the PDF group the same fields into panels instead
 * (`ProfileSheet.tsx` is typed against `ProfileFieldKey`, so a field added
 * here cannot be left off the page).
 *
 * Name, pronouns, relationship and bio sit above the sections and are not
 * listed here.
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
  fields: readonly ProfileFieldKey[];
}

export const PROFILE_SECTIONS: readonly ProfileSectionDef[] = [
  {
    id: "overview",
    title: "Overview",
    fields: ["profession", "birthday", "tags"],
  },
  {
    id: "interests",
    title: "Favorites & interests",
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
    fields: ["hangout_places", "food_restrictions", "political_views"],
  },
  {
    id: "deep",
    title: "Deep dive",
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
