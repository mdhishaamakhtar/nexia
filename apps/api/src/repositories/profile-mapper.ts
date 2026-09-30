import type { ProfileInput, ProfileOutput, ProfileSummary, RelationshipType } from "@nexia/shared";
import type { profiles } from "../db/schema";
import { zodiacForBirthday } from "../services/zodiac";

export type ProfileRow = typeof profiles.$inferSelect;
type NewProfileRow = typeof profiles.$inferInsert;
type ProfileRowPatch = Partial<Omit<NewProfileRow, "id" | "userId" | "createdAt">>;

/** The columns the list and search surfaces read. */
export type ProfileSummaryRow = Pick<
  ProfileRow,
  "id" | "fullName" | "pronouns" | "relationshipType" | "birthday" | "tags"
>;

export function toProfileSummary(row: ProfileSummaryRow): ProfileSummary {
  return {
    id: row.id,
    full_name: row.fullName,
    pronouns: row.pronouns,
    relationship_type: row.relationshipType as RelationshipType,
    zodiac_sign: zodiacForBirthday(row.birthday),
    tags: row.tags,
  };
}

/** Maps a stored row into the snake_case `ProfileOutput` API contract. */
export function toProfileOutput(row: ProfileRow): ProfileOutput {
  return {
    id: row.id,
    user_id: row.userId,
    full_name: row.fullName,
    pronouns: row.pronouns,
    relationship_type: row.relationshipType as RelationshipType,
    bio: row.bio,
    profession: row.profession,
    long_term_goals: row.longTermGoals,
    birthday: row.birthday,
    zodiac_sign: zodiacForBirthday(row.birthday),
    music_preference: row.musicPreference,
    favorite_movie: row.favoriteMovie,
    favorite_book: row.favoriteBook,
    notes: row.notes,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    tags: row.tags,
    political_views: row.politicalViews,
    food_restrictions: row.foodRestrictions,
    movie_genres: row.movieGenres,
    book_genres: row.bookGenres,
    hangout_places: row.hangoutPlaces,
    quotes: row.quotes,
    favorite_memories: row.favoriteMemories,
    top_songs: row.topSongs,
    associated_song: row.associatedSong ?? null,
  };
}

/**
 * Maps any subset of the contract onto columns. A key left `undefined` stays
 * `undefined`, and Drizzle's `.set()` skips those, so this one function serves
 * both a full insert and a merge-style update.
 */
export function toProfilePatch(input: Partial<ProfileInput>): ProfileRowPatch {
  return {
    fullName: input.full_name,
    pronouns: input.pronouns,
    relationshipType: input.relationship_type,
    bio: input.bio,
    profession: input.profession,
    longTermGoals: input.long_term_goals,
    birthday: input.birthday,
    musicPreference: input.music_preference,
    favoriteMovie: input.favorite_movie,
    favoriteBook: input.favorite_book,
    notes: input.notes,
    tags: input.tags,
    politicalViews: input.political_views,
    foodRestrictions: input.food_restrictions,
    movieGenres: input.movie_genres,
    bookGenres: input.book_genres,
    hangoutPlaces: input.hangout_places,
    quotes: input.quotes,
    favoriteMemories: input.favorite_memories,
    topSongs: input.top_songs,
    associatedSong: input.associated_song,
  };
}

export function toNewProfileRow(userId: number, input: ProfileInput): NewProfileRow {
  return {
    ...toProfilePatch(input),
    userId,
    fullName: input.full_name,
    relationshipType: input.relationship_type,
  };
}
