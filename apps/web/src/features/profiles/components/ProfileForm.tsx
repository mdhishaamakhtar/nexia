"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Coffee, Heart, MessageSquare, Plus, Star, Trash2, User } from "lucide-react";
import { useRef } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { RELATIONSHIP_TYPES } from "@nexia/shared";
import Input from "@/components/atoms/Input";
import Select from "@/components/atoms/Select";
import Textarea from "@/components/atoms/Textarea";
import type { ProfileFormValues } from "@/shared/types/profile";
import ProfileFormSection from "./ProfileFormSection";
import FieldArrayInput from "./FieldArrayInput";
import FormActionBar from "./FormActionBar";

const MAX_TOP_SONGS = 3;

// id and profile_id must survive validation so the API can upsert associations
// instead of duplicating them on every save.
const associationId = {
  id: z.number().optional(),
  profile_id: z.number().optional(),
};

const schema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  pronouns: z.string(),
  relationship_type: z.enum(RELATIONSHIP_TYPES),
  bio: z.string(),
  profession: z.string(),
  long_term_goals: z.string(),
  birthday: z.string(),
  music_preference: z.string(),
  favorite_movie: z.string(),
  favorite_book: z.string(),
  notes: z.string(),
  tags: z.array(z.object({ ...associationId, tag: z.string() })),
  top_songs: z
    .array(z.object({ ...associationId, name: z.string(), artist: z.string() }))
    .max(MAX_TOP_SONGS, `Pick up to ${MAX_TOP_SONGS} songs`),
  quotes: z.array(z.object({ ...associationId, quote: z.string() })),
  favorite_memories: z.array(z.object({ ...associationId, memory: z.string() })),
  movie_genres: z.array(z.object({ ...associationId, genre: z.string() })),
  book_genres: z.array(z.object({ ...associationId, genre: z.string() })),
  hangout_places: z.array(z.object({ ...associationId, place: z.string() })),
  food_restrictions: z.array(z.object({ ...associationId, restriction: z.string() })),
  political_views: z.array(z.object({ ...associationId, view: z.string() })),
  associated_song_name: z.string(),
  associated_song_artist: z.string(),
});

const RELATIONSHIP_OPTIONS = RELATIONSHIP_TYPES.map((type) => ({ value: type, label: type }));

export default function ProfileForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  cancelHref,
}: {
  initialValues: ProfileFormValues;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
  cancelHref: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    control,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  // keyName "_key" stops RHF overwriting the data's own "id" with its UUID.
  const tagsField = useFieldArray({ control, name: "tags", keyName: "_key" });
  const quotesField = useFieldArray({ control, name: "quotes", keyName: "_key" });
  const memoriesField = useFieldArray({ control, name: "favorite_memories", keyName: "_key" });
  const movieGenresField = useFieldArray({ control, name: "movie_genres", keyName: "_key" });
  const bookGenresField = useFieldArray({ control, name: "book_genres", keyName: "_key" });
  const placesField = useFieldArray({ control, name: "hangout_places", keyName: "_key" });
  const foodField = useFieldArray({ control, name: "food_restrictions", keyName: "_key" });
  const politicsField = useFieldArray({ control, name: "political_views", keyName: "_key" });
  const songsField = useFieldArray({ control, name: "top_songs", keyName: "_key" });

  const songNameRef = useRef<HTMLInputElement>(null);
  const songArtistRef = useRef<HTMLInputElement>(null);
  const songs = useWatch({ control, name: "top_songs" });
  const songsFull = songs.length >= MAX_TOP_SONGS;

  const addTopSong = () => {
    const name = songNameRef.current?.value.trim() ?? "";
    const artist = songArtistRef.current?.value.trim() ?? "";
    if (!name || !artist) return;

    songsField.append({ name, artist });
    if (songNameRef.current) songNameRef.current.value = "";
    if (songArtistRef.current) songArtistRef.current.value = "";
    songNameRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Bottom padding clears the fixed action bar so the last field is reachable. */}
      <div className="space-y-4 pb-28">
        <ProfileFormSection id="basic" title="Basic information" icon={User} index={0}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input label="Full name" {...register("full_name")} error={errors.full_name?.message} />
            <Input
              label="Pronouns"
              placeholder="e.g. she/her, they/them"
              {...register("pronouns")}
            />
            <Select
              label="Relationship"
              options={RELATIONSHIP_OPTIONS}
              {...register("relationship_type")}
            />
            <Input label="Birthday" type="date" {...register("birthday")} />
            <Input label="Profession" {...register("profession")} />

            <div className="md:col-span-2">
              <Textarea label="Bio" rows={4} {...register("bio")} />
            </div>

            <div className="md:col-span-2">
              <FieldArrayInput
                label="Tags"
                placeholder="Type a tag and press Enter"
                fieldKey="tag"
                items={tagsField.fields}
                append={tagsField.append}
                remove={tagsField.remove}
              />
            </div>
          </div>
        </ProfileFormSection>

        <ProfileFormSection id="interests" title="Interests & favorites" icon={Star} index={1}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input label="Music preference" {...register("music_preference")} />
            <Input label="Favorite movie" {...register("favorite_movie")} />
            <Input label="Favorite book" {...register("favorite_book")} />

            <div className="paper-sunk rounded-xl p-4 md:col-span-2">
              <h3
                className="mb-4 flex items-center gap-2 text-sm font-bold"
                style={{ color: "var(--text-2)" }}
              >
                <Heart className="h-4 w-4" style={{ color: "var(--text-3)" }} aria-hidden="true" />
                Their song
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  placeholder="Song name"
                  aria-label="Associated song name"
                  {...register("associated_song_name")}
                />
                <Input
                  placeholder="Artist"
                  aria-label="Associated song artist"
                  {...register("associated_song_artist")}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <span className="t-label mb-2 block">Top songs</span>

              {songsField.fields.length > 0 && (
                <ul className="mb-2.5 space-y-2">
                  {songsField.fields.map((field, index) => (
                    <li
                      key={field._key}
                      className="paper-sunk flex items-center justify-between gap-3 rounded-xl px-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <p
                          className="truncate text-sm font-semibold"
                          style={{ color: "var(--text-1)" }}
                        >
                          {songs[index]?.name || "Untitled"}
                        </p>
                        <p className="truncate text-xs" style={{ color: "var(--text-3)" }}>
                          {songs[index]?.artist}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => songsField.remove(index)}
                        aria-label={`Remove ${songs[index]?.name || "song"}`}
                        className="-mr-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-(--red-bg)"
                        style={{ color: "var(--red-ink)" }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {errors.top_songs?.message && (
                <p
                  role="alert"
                  className="mb-2 text-xs font-semibold"
                  style={{ color: "var(--red-ink)" }}
                >
                  {errors.top_songs.message}
                </p>
              )}

              {songsFull ? (
                <p className="text-xs" style={{ color: "var(--text-3)" }}>
                  That&apos;s all {MAX_TOP_SONGS} — remove one to swap it out.
                </p>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    ref={songNameRef}
                    placeholder="Song name"
                    aria-label="Top song name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTopSong();
                      }
                    }}
                    className="field min-w-0 flex-1 px-4 py-3"
                  />
                  <input
                    ref={songArtistRef}
                    placeholder="Artist"
                    aria-label="Top song artist"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTopSong();
                      }
                    }}
                    className="field min-w-0 flex-1 px-4 py-3"
                  />
                  <button
                    type="button"
                    onClick={addTopSong}
                    aria-label="Add top song"
                    className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors hover:bg-(--surface-2) active:scale-95 sm:w-11 sm:px-0"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border)",
                      color: "var(--text-2)",
                    }}
                  >
                    <Plus className="h-5 w-5" aria-hidden="true" />
                    <span className="sm:hidden">Add song</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </ProfileFormSection>

        <ProfileFormSection id="lifestyle" title="Lifestyle" icon={Coffee} index={2}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <FieldArrayInput
              label="Hangout places"
              placeholder="Add a place"
              fieldKey="place"
              items={placesField.fields}
              append={placesField.append}
              remove={placesField.remove}
            />
            <FieldArrayInput
              label="Food restrictions"
              placeholder="Add a restriction"
              fieldKey="restriction"
              items={foodField.fields}
              append={foodField.append}
              remove={foodField.remove}
            />
            <FieldArrayInput
              label="Movie genres"
              placeholder="Add a genre"
              fieldKey="genre"
              items={movieGenresField.fields}
              append={movieGenresField.append}
              remove={movieGenresField.remove}
            />
            <FieldArrayInput
              label="Book genres"
              placeholder="Add a genre"
              fieldKey="genre"
              items={bookGenresField.fields}
              append={bookGenresField.append}
              remove={bookGenresField.remove}
            />
          </div>
        </ProfileFormSection>

        <ProfileFormSection id="deep" title="Deep dive" icon={MessageSquare} index={3}>
          <div className="space-y-5">
            <Textarea label="Long term goals" rows={3} {...register("long_term_goals")} />

            <FieldArrayInput
              label="Favorite memories"
              placeholder="Add a memory"
              fieldKey="memory"
              items={memoriesField.fields}
              append={memoriesField.append}
              remove={memoriesField.remove}
              variant="block"
            />

            <Textarea
              label="Additional notes"
              rows={4}
              placeholder="Anything else worth remembering…"
              {...register("notes")}
            />

            <FieldArrayInput
              label="Quotes"
              placeholder="Add a quote"
              fieldKey="quote"
              items={quotesField.fields}
              append={quotesField.append}
              remove={quotesField.remove}
              variant="block"
            />
            <FieldArrayInput
              label="Political views"
              placeholder="Add a view"
              fieldKey="view"
              items={politicsField.fields}
              append={politicsField.append}
              remove={politicsField.remove}
            />
          </div>
        </ProfileFormSection>
      </div>

      <FormActionBar
        isDirty={isDirty}
        isSubmitting={isSubmitting}
        submitLabel={submitLabel}
        cancelHref={cancelHref}
      />
    </form>
  );
}
