import type { ProfileOutput, RelationshipType, ZodiacSign } from "@nexia/shared";
import type {
  profiles,
  tags,
  politicalViews,
  foodRestrictions,
  movieGenres,
  bookGenres,
  hangoutPlaces,
  quotes,
  topSongs,
  associatedSongs,
} from "../db/schema";

type ProfileRow = typeof profiles.$inferSelect;
type TagRow = typeof tags.$inferSelect;
type PoliticalViewRow = typeof politicalViews.$inferSelect;
type FoodRestrictionRow = typeof foodRestrictions.$inferSelect;
type MovieGenreRow = typeof movieGenres.$inferSelect;
type BookGenreRow = typeof bookGenres.$inferSelect;
type HangoutPlaceRow = typeof hangoutPlaces.$inferSelect;
type QuoteRow = typeof quotes.$inferSelect;
type TopSongRow = typeof topSongs.$inferSelect;
type AssociatedSongRow = typeof associatedSongs.$inferSelect;

/** All child rows belonging to a single profile, as loaded from the DB. */
export interface ProfileChildren {
  tags: TagRow[];
  politicalViews: PoliticalViewRow[];
  foodRestrictions: FoodRestrictionRow[];
  movieGenres: MovieGenreRow[];
  bookGenres: BookGenreRow[];
  hangoutPlaces: HangoutPlaceRow[];
  quotes: QuoteRow[];
  topSongs: TopSongRow[];
  associatedSong: AssociatedSongRow | null;
}

export function emptyChildren(): ProfileChildren {
  return {
    tags: [],
    politicalViews: [],
    foodRestrictions: [],
    movieGenres: [],
    bookGenres: [],
    hangoutPlaces: [],
    quotes: [],
    topSongs: [],
    associatedSong: null,
  };
}

/**
 * Maps a Drizzle profile row plus its hydrated child rows into the snake_case
 * `ProfileOutput` API contract. Nullable text columns collapse to empty strings
 * to match the contract (which types them as required strings), mirroring the
 * Go GORM model's zero-value JSON behaviour.
 */
export function toProfileOutput(row: ProfileRow, children: ProfileChildren): ProfileOutput {
  return {
    id: row.id,
    user_id: row.userId,
    full_name: row.fullName,
    relationship_type: row.relationshipType as RelationshipType,
    bio: row.bio ?? "",
    profession: row.profession ?? "",
    long_term_goals: row.longTermGoals ?? "",
    birthday: row.birthday ?? null,
    zodiac_sign: (row.zodiacSign as ZodiacSign | null) ?? null,
    music_preference: row.musicPreference ?? "",
    favorite_movie: row.favoriteMovie ?? "",
    favorite_book: row.favoriteBook ?? "",
    favorite_memory: row.favoriteMemory ?? "",
    notes: row.notes ?? "",
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    tags: children.tags.map((t) => ({
      id: t.id,
      profile_id: t.profileId,
      tag: t.tag ?? "",
    })),
    political_views: children.politicalViews.map((v) => ({
      id: v.id,
      profile_id: v.profileId,
      view: v.view ?? "",
    })),
    food_restrictions: children.foodRestrictions.map((r) => ({
      id: r.id,
      profile_id: r.profileId,
      restriction: r.restriction ?? "",
    })),
    movie_genres: children.movieGenres.map((g) => ({
      id: g.id,
      profile_id: g.profileId,
      genre: g.genre ?? "",
    })),
    book_genres: children.bookGenres.map((g) => ({
      id: g.id,
      profile_id: g.profileId,
      genre: g.genre ?? "",
    })),
    hangout_places: children.hangoutPlaces.map((p) => ({
      id: p.id,
      profile_id: p.profileId,
      place: p.place ?? "",
    })),
    quotes: children.quotes.map((q) => ({
      id: q.id,
      profile_id: q.profileId,
      quote: q.quote ?? "",
    })),
    top_songs: children.topSongs.map((s) => ({
      id: s.id,
      profile_id: s.profileId,
      name: s.name ?? "",
      artist: s.artist ?? "",
    })),
    associated_song: children.associatedSong
      ? {
          profile_id: children.associatedSong.profileId,
          name: children.associatedSong.name ?? "",
          artist: children.associatedSong.artist ?? "",
        }
      : null,
  };
}
