import { z } from "zod";
import { relationshipTypeSchema, zodiacSignSchema } from "./enums";

/**
 * Limits for every free-text field. The API, the profile form and the chat
 * agent's tool schema all read them from here, so a value that passes the form
 * can never be one the database rejects. Scalar limits match the column sizes;
 * the text-column limits are generous caps rather than storage constraints.
 */
export const PROFILE_TEXT_LIMITS = {
  full_name: 150,
  pronouns: 100,
  bio: 4000,
  profession: 150,
  long_term_goals: 4000,
  music_preference: 1000,
  favorite_movie: 200,
  favorite_book: 200,
  notes: 10000,
} as const;

/** The list fields, each stored as a plain array of strings on the profile. */
export const PROFILE_LIST_FIELDS = [
  "tags",
  "political_views",
  "food_restrictions",
  "movie_genres",
  "book_genres",
  "hangout_places",
  "quotes",
  "favorite_memories",
] as const;

export type ProfileListField = (typeof PROFILE_LIST_FIELDS)[number];

export const PROFILE_LIST_LIMITS: Record<ProfileListField, { items: number; length: number }> = {
  tags: { items: 50, length: 255 },
  political_views: { items: 50, length: 255 },
  food_restrictions: { items: 50, length: 255 },
  movie_genres: { items: 50, length: 255 },
  book_genres: { items: 50, length: 255 },
  hangout_places: { items: 50, length: 255 },
  quotes: { items: 50, length: 2000 },
  favorite_memories: { items: 50, length: 4000 },
};

export const MAX_TOP_SONGS = 3;
export const SONG_FIELD_LIMIT = 255;

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`);

const listOf = ({ items, length }: { items: number; length: number }) =>
  z
    .array(
      z
        .string()
        .trim()
        .min(1, "Entries can't be empty")
        .max(length, `Keep each entry under ${length} characters`)
    )
    .max(items, `Keep this list to ${items} entries`);

/** A song as written: the artist is optional, since people often only remember the title. */
export const songInputSchema = z.object({
  name: z.string().trim().min(1, "Add the song's name").max(SONG_FIELD_LIMIT),
  artist: z.string().trim().max(SONG_FIELD_LIMIT).default(""),
});

export const songSchema = z.object({
  name: z.string(),
  artist: z.string(),
});

/** A calendar date that actually exists, as YYYY-MM-DD. */
export const birthdaySchema = z.iso.date({ error: "Use a real date (YYYY-MM-DD)" });

export const profileInputSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(
      PROFILE_TEXT_LIMITS.full_name,
      `Keep this under ${PROFILE_TEXT_LIMITS.full_name} characters`
    ),
  pronouns: text(PROFILE_TEXT_LIMITS.pronouns).optional(),
  relationship_type: relationshipTypeSchema,
  bio: text(PROFILE_TEXT_LIMITS.bio).optional(),
  profession: text(PROFILE_TEXT_LIMITS.profession).optional(),
  long_term_goals: text(PROFILE_TEXT_LIMITS.long_term_goals).optional(),
  birthday: birthdaySchema.nullish(),
  music_preference: text(PROFILE_TEXT_LIMITS.music_preference).optional(),
  favorite_movie: text(PROFILE_TEXT_LIMITS.favorite_movie).optional(),
  favorite_book: text(PROFILE_TEXT_LIMITS.favorite_book).optional(),
  notes: text(PROFILE_TEXT_LIMITS.notes).optional(),
  tags: listOf(PROFILE_LIST_LIMITS.tags).optional(),
  political_views: listOf(PROFILE_LIST_LIMITS.political_views).optional(),
  food_restrictions: listOf(PROFILE_LIST_LIMITS.food_restrictions).optional(),
  movie_genres: listOf(PROFILE_LIST_LIMITS.movie_genres).optional(),
  book_genres: listOf(PROFILE_LIST_LIMITS.book_genres).optional(),
  hangout_places: listOf(PROFILE_LIST_LIMITS.hangout_places).optional(),
  quotes: listOf(PROFILE_LIST_LIMITS.quotes).optional(),
  favorite_memories: listOf(PROFILE_LIST_LIMITS.favorite_memories).optional(),
  top_songs: z
    .array(songInputSchema)
    .max(MAX_TOP_SONGS, `Pick up to ${MAX_TOP_SONGS} top songs`)
    .optional(),
  associated_song: songInputSchema.nullish(),
});

/**
 * A stored profile. The zodiac sign is not stored: it is derived from the
 * birthday every time a profile is read, so it can never disagree with it.
 */
export const profileOutputSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  full_name: z.string(),
  pronouns: z.string(),
  relationship_type: relationshipTypeSchema,
  bio: z.string(),
  profession: z.string(),
  long_term_goals: z.string(),
  birthday: z.string().nullable(),
  zodiac_sign: zodiacSignSchema.nullable(),
  music_preference: z.string(),
  favorite_movie: z.string(),
  favorite_book: z.string(),
  notes: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  tags: z.array(z.string()),
  political_views: z.array(z.string()),
  food_restrictions: z.array(z.string()),
  movie_genres: z.array(z.string()),
  book_genres: z.array(z.string()),
  hangout_places: z.array(z.string()),
  quotes: z.array(z.string()),
  favorite_memories: z.array(z.string()),
  top_songs: z.array(songSchema),
  associated_song: songSchema.nullable(),
});

/**
 * Lean projection used by list/search surfaces (slambook grid, chat result
 * cards). Holds only the fields those cards render. A full `ProfileOutput` is
 * structurally a valid `ProfileSummary`.
 */
export const profileSummarySchema = z.object({
  id: z.number(),
  full_name: z.string(),
  pronouns: z.string(),
  relationship_type: relationshipTypeSchema,
  zodiac_sign: zodiacSignSchema.nullable(),
  tags: z.array(z.string()),
});

export const profileListResponseSchema = z.object({
  data: z.array(profileSummarySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const PROFILE_PAGE_SIZE_MAX = 100;

export const listProfilesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(PROFILE_PAGE_SIZE_MAX).default(24),
  search: z.string().trim().max(PROFILE_TEXT_LIMITS.full_name).optional(),
  relationship_type: relationshipTypeSchema.optional(),
});

export type Song = z.infer<typeof songSchema>;
/** A validated profile, as the API and the agent's tools receive it. */
export type ProfileInput = z.output<typeof profileInputSchema>;
/** What a client may send: the same shape before defaults are applied. */
export type ProfilePayload = z.input<typeof profileInputSchema>;
export type ProfileOutput = z.infer<typeof profileOutputSchema>;
export type ProfileSummary = z.infer<typeof profileSummarySchema>;
export type ProfileListResponse = z.infer<typeof profileListResponseSchema>;
