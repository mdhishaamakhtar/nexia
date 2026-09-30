import { z } from "zod";
import {
  birthdaySchema,
  PROFILE_LIST_FIELDS,
  PROFILE_LIST_LIMITS,
  PROFILE_TEXT_LIMITS,
  profileInputSchema,
  type ProfileListField,
  type ProfileOutput,
  type ProfilePayload,
  RELATIONSHIP_TYPES,
  SONG_FIELD_LIMIT,
} from "@nexia/shared";

const text = (max: number) => z.string().max(max, `Keep this under ${max} characters`);

/**
 * What someone has typed into an "add" box but not yet added. It is part of
 * the form on purpose: typing there marks the form dirty, and saving folds it
 * into the list, so a tag typed and never Entered is saved, not lost.
 */
const draftsSchema = z.object({
  ...(Object.fromEntries(
    PROFILE_LIST_FIELDS.map((f) => [f, text(PROFILE_LIST_LIMITS[f].length)])
  ) as Record<ProfileListField, z.ZodString>),
  song_name: text(SONG_FIELD_LIMIT),
  song_artist: text(SONG_FIELD_LIMIT),
});

const shape = profileInputSchema.shape;

/**
 * The profile form's schema, built from the shared contract's own field
 * schemas so its limits can never drift from what the API accepts. Only the
 * shapes differ: every text box is a plain string, the birthday is "" when
 * unset, and "their song" is always two strings.
 */
export const profileFormSchema = z
  .object({
    full_name: shape.full_name,
    pronouns: text(PROFILE_TEXT_LIMITS.pronouns),
    relationship_type: z.enum(RELATIONSHIP_TYPES),
    birthday: z.union([z.literal(""), birthdaySchema]),
    profession: text(PROFILE_TEXT_LIMITS.profession),
    bio: text(PROFILE_TEXT_LIMITS.bio),
    music_preference: text(PROFILE_TEXT_LIMITS.music_preference),
    favorite_movie: text(PROFILE_TEXT_LIMITS.favorite_movie),
    favorite_book: text(PROFILE_TEXT_LIMITS.favorite_book),
    long_term_goals: text(PROFILE_TEXT_LIMITS.long_term_goals),
    notes: text(PROFILE_TEXT_LIMITS.notes),
    ...(Object.fromEntries(PROFILE_LIST_FIELDS.map((f) => [f, shape[f].unwrap()])) as {
      [F in ProfileListField]: ReturnType<(typeof shape)[F]["unwrap"]>;
    }),
    top_songs: shape.top_songs.unwrap(),
    associated_song: z.object({ name: text(SONG_FIELD_LIMIT), artist: text(SONG_FIELD_LIMIT) }),
    drafts: draftsSchema,
  })
  .superRefine((values, ctx) => {
    if (values.associated_song.artist.trim() && !values.associated_song.name.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["associated_song", "name"],
        message: "Add the song's name too",
      });
    }
    if (values.drafts.song_artist.trim() && !values.drafts.song_name.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["drafts", "song_name"],
        message: "Add the song's name too",
      });
    }
  });

export type ProfileFormValues = z.input<typeof profileFormSchema>;

const EMPTY_DRAFTS = {
  ...(Object.fromEntries(PROFILE_LIST_FIELDS.map((f) => [f, ""])) as Record<
    ProfileListField,
    string
  >),
  song_name: "",
  song_artist: "",
};

export function toFormValues(profile?: ProfileOutput): ProfileFormValues {
  return {
    full_name: profile?.full_name ?? "",
    pronouns: profile?.pronouns ?? "",
    relationship_type: profile?.relationship_type ?? "Friend",
    birthday: profile?.birthday ?? "",
    profession: profile?.profession ?? "",
    bio: profile?.bio ?? "",
    music_preference: profile?.music_preference ?? "",
    favorite_movie: profile?.favorite_movie ?? "",
    favorite_book: profile?.favorite_book ?? "",
    long_term_goals: profile?.long_term_goals ?? "",
    notes: profile?.notes ?? "",
    tags: profile?.tags ?? [],
    political_views: profile?.political_views ?? [],
    food_restrictions: profile?.food_restrictions ?? [],
    movie_genres: profile?.movie_genres ?? [],
    book_genres: profile?.book_genres ?? [],
    hangout_places: profile?.hangout_places ?? [],
    quotes: profile?.quotes ?? [],
    favorite_memories: profile?.favorite_memories ?? [],
    top_songs: profile?.top_songs ?? [],
    associated_song: profile?.associated_song ?? { name: "", artist: "" },
    drafts: { ...EMPTY_DRAFTS },
  };
}

/** Appends `item` unless it is blank or already there (ignoring case). */
export function withItem(items: readonly string[], item: string): string[] {
  const trimmed = item.trim();
  if (!trimmed || items.some((i) => i.toLowerCase() === trimmed.toLowerCase())) return [...items];
  return [...items, trimmed];
}

/** The request body for a form, with any half-typed entries folded in. */
export function toProfilePayload(values: ProfileFormValues): ProfilePayload {
  const lists = Object.fromEntries(
    PROFILE_LIST_FIELDS.map((f) => [f, withItem(values[f], values.drafts[f])])
  ) as Record<ProfileListField, string[]>;

  const topSongs = [...values.top_songs];
  if (values.drafts.song_name.trim()) {
    topSongs.push({
      name: values.drafts.song_name.trim(),
      artist: values.drafts.song_artist.trim(),
    });
  }

  const song = values.associated_song;
  return {
    full_name: values.full_name,
    pronouns: values.pronouns,
    relationship_type: values.relationship_type,
    birthday: values.birthday || null,
    profession: values.profession,
    bio: values.bio,
    music_preference: values.music_preference,
    favorite_movie: values.favorite_movie,
    favorite_book: values.favorite_book,
    long_term_goals: values.long_term_goals,
    notes: values.notes,
    ...lists,
    top_songs: topSongs,
    associated_song: song.name.trim() ? { name: song.name, artist: song.artist } : null,
  };
}
