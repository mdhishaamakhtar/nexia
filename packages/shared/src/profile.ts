import { z } from "zod";
import { relationshipTypeSchema, zodiacSignSchema } from "./enums";

const birthdaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullish();

export const tagSchema = z.object({
  id: z.number().optional(),
  profile_id: z.number().optional(),
  tag: z.string(),
});

export const politicalViewSchema = z.object({
  id: z.number().optional(),
  profile_id: z.number().optional(),
  view: z.string(),
});

export const foodRestrictionSchema = z.object({
  id: z.number().optional(),
  profile_id: z.number().optional(),
  restriction: z.string(),
});

export const movieGenreSchema = z.object({
  id: z.number().optional(),
  profile_id: z.number().optional(),
  genre: z.string(),
});

export const bookGenreSchema = z.object({
  id: z.number().optional(),
  profile_id: z.number().optional(),
  genre: z.string(),
});

export const hangoutPlaceSchema = z.object({
  id: z.number().optional(),
  profile_id: z.number().optional(),
  place: z.string(),
});

export const quoteSchema = z.object({
  id: z.number().optional(),
  profile_id: z.number().optional(),
  quote: z.string(),
});

export const favoriteMemorySchema = z.object({
  id: z.number().optional(),
  profile_id: z.number().optional(),
  memory: z.string(),
});

export const topSongSchema = z.object({
  id: z.number().optional(),
  profile_id: z.number().optional(),
  name: z.string(),
  artist: z.string(),
});

export const associatedSongSchema = z.object({
  profile_id: z.number().optional(),
  name: z.string(),
  artist: z.string(),
});

export const profileInputSchema = z.object({
  full_name: z.string().min(1).max(150),
  pronouns: z.string().max(100).optional(),
  relationship_type: relationshipTypeSchema,
  bio: z.string().optional(),
  profession: z.string().optional(),
  long_term_goals: z.string().optional(),
  birthday: birthdaySchema,
  zodiac_sign: zodiacSignSchema.optional(),
  music_preference: z.string().optional(),
  favorite_movie: z.string().optional(),
  favorite_book: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(tagSchema).optional(),
  political_views: z.array(politicalViewSchema).optional(),
  food_restrictions: z.array(foodRestrictionSchema).optional(),
  movie_genres: z.array(movieGenreSchema).optional(),
  book_genres: z.array(bookGenreSchema).optional(),
  hangout_places: z.array(hangoutPlaceSchema).optional(),
  quotes: z.array(quoteSchema).optional(),
  favorite_memories: z.array(favoriteMemorySchema).optional(),
  top_songs: z.array(topSongSchema).optional(),
  associated_song: associatedSongSchema.nullish(),
});

export const profileOutputSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  full_name: z.string(),
  pronouns: z.string(),
  relationship_type: relationshipTypeSchema,
  bio: z.string(),
  profession: z.string(),
  long_term_goals: z.string(),
  birthday: birthdaySchema,
  zodiac_sign: zodiacSignSchema.nullish(),
  music_preference: z.string(),
  favorite_movie: z.string(),
  favorite_book: z.string(),
  notes: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  tags: z.array(z.object({ id: z.number(), profile_id: z.number(), tag: z.string() })),
  political_views: z.array(z.object({ id: z.number(), profile_id: z.number(), view: z.string() })),
  food_restrictions: z.array(
    z.object({
      id: z.number(),
      profile_id: z.number(),
      restriction: z.string(),
    })
  ),
  movie_genres: z.array(z.object({ id: z.number(), profile_id: z.number(), genre: z.string() })),
  book_genres: z.array(z.object({ id: z.number(), profile_id: z.number(), genre: z.string() })),
  hangout_places: z.array(z.object({ id: z.number(), profile_id: z.number(), place: z.string() })),
  quotes: z.array(z.object({ id: z.number(), profile_id: z.number(), quote: z.string() })),
  favorite_memories: z.array(
    z.object({ id: z.number(), profile_id: z.number(), memory: z.string() })
  ),
  top_songs: z.array(
    z.object({
      id: z.number(),
      profile_id: z.number(),
      name: z.string(),
      artist: z.string(),
    })
  ),
  associated_song: z
    .object({
      profile_id: z.number(),
      name: z.string(),
      artist: z.string(),
    })
    .nullish(),
});

/**
 * Lean projection used by list/search surfaces (slambook grid, chat result
 * cards). Holds only the fields those cards render, so the list query never
 * hydrates the nine child collections it would otherwise throw away. A full
 * `ProfileOutput` is structurally a valid `ProfileSummary`.
 */
export const profileSummarySchema = z.object({
  id: z.number(),
  full_name: z.string(),
  pronouns: z.string(),
  relationship_type: relationshipTypeSchema,
  zodiac_sign: zodiacSignSchema.nullish(),
  tags: z.array(z.object({ id: z.number(), profile_id: z.number(), tag: z.string() })),
});

export const profileListResponseSchema = z.object({
  data: z.array(profileSummarySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const createProfileResponseSchema = z.object({
  id: z.number(),
});

export const listProfilesQuerySchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  search: z.string().optional(),
  relationship_type: relationshipTypeSchema.optional(),
});

export type Tag = z.infer<typeof tagSchema>;
export type PoliticalView = z.infer<typeof politicalViewSchema>;
export type FoodRestriction = z.infer<typeof foodRestrictionSchema>;
export type MovieGenre = z.infer<typeof movieGenreSchema>;
export type BookGenre = z.infer<typeof bookGenreSchema>;
export type HangoutPlace = z.infer<typeof hangoutPlaceSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type FavoriteMemory = z.infer<typeof favoriteMemorySchema>;
export type TopSong = z.infer<typeof topSongSchema>;
export type AssociatedSong = z.infer<typeof associatedSongSchema>;
export type ProfileInput = z.infer<typeof profileInputSchema>;
export type ProfileOutput = z.infer<typeof profileOutputSchema>;
export type ProfileSummary = z.infer<typeof profileSummarySchema>;
export type ProfileListResponse = z.infer<typeof profileListResponseSchema>;
export type CreateProfileResponse = z.infer<typeof createProfileResponseSchema>;
export type ListProfilesQuery = z.infer<typeof listProfilesQuerySchema>;
