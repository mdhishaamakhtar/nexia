"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { RELATIONSHIP_TYPES } from "@nexia/shared";
import Input from "@/components/atoms/Input";
import Select from "@/components/atoms/Select";
import Textarea from "@/components/atoms/Textarea";
import type { ProfileFormValues } from "@/shared/types/profile";
import { PROFILE_SECTIONS, RANK_TINTS } from "../sections";
import SheetSection from "./SheetSection";
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
    // Bottom padding clears the fixed action bar so the last field is reachable.
    // It sits outside the sheet — the sheet ends where the content ends.
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="pb-28">
      {/* Editing is the same sheet of paper the profile is read on: same tape,
          same colours, same section order. A profile form that looked like a
          settings screen made writing someone down feel like filing them. */}
      <div className="paper rounded-[28px] px-5 py-7 sm:px-9 sm:py-9">
        <SheetSection section={PROFILE_SECTIONS.overview} index={0}>
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
                chip="tag"
              />
            </div>
          </div>
        </SheetSection>

        <SheetSection section={PROFILE_SECTIONS.interests} index={1}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input label="Music preference" {...register("music_preference")} />
            <Input label="Favorite movie" {...register("favorite_movie")} />
            <Input label="Favorite book" {...register("favorite_book")} />

            {/* The peach well from the detail page, in its editable state — so
                you can see what you are filling in before you save. The fields
                inside stay white: a tinted field on a tinted well would read as
                muddy paper rather than a hole punched in it. */}
            <div
              className="rounded-2xl border px-4 pb-4 pt-4 md:col-span-2"
              style={{ background: "var(--peach-soft)", borderColor: "var(--peach-line)" }}
            >
              <h3 className="t-label mb-3" style={{ color: "var(--peach-ink)" }}>
                Their song
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                <ol className="mb-3 space-y-2.5">
                  {songsField.fields.map((field, index) => {
                    const tint = RANK_TINTS[index % RANK_TINTS.length]!;
                    return (
                      <li key={field._key} className="flex items-center gap-3.5">
                        {/* Same ranked badges the profile shows, so the order
                            you set here is the order you will recognise. */}
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-sm font-extrabold"
                          style={{
                            background: tint.wash,
                            borderColor: tint.line,
                            color: tint.ink,
                          }}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-semibold"
                            style={{ color: "var(--text-1)" }}
                          >
                            {songs[index]?.name || "Untitled"}
                          </p>
                          <p className="truncate text-xs" style={{ color: "var(--text-2)" }}>
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
                    );
                  })}
                </ol>
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
                  {/* Height comes from the row, not a hard `h-11`: `.field` is
                      min-height 44px *plus* its padding and line box, so a
                      fixed 44px button sat about a pixel short of the inputs
                      beside it. Stretching matches whatever the field computes
                      to at any font size. */}
                  <button
                    type="button"
                    onClick={addTopSong}
                    aria-label="Add top song"
                    className="flex min-h-11 shrink-0 items-center justify-center gap-2 self-stretch rounded-xl border px-4 text-sm font-semibold transition-colors hover:bg-(--surface-2) active:scale-95 sm:w-11 sm:px-0"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border-mid)",
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
        </SheetSection>

        <SheetSection section={PROFILE_SECTIONS.lifestyle} index={2}>
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
        </SheetSection>

        <SheetSection section={PROFILE_SECTIONS.deep} index={3}>
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
              chip="quote"
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
        </SheetSection>
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
