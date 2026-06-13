"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  Coffee,
  Heart,
  MessageSquare,
  Plus,
  Save,
  Star,
  Trash2,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRef } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import type { ProfileFormValues } from "@/shared/types/profile";
import ProfileFormSection from "./ProfileFormSection";
import FieldArrayInput from "./FieldArrayInput";

const schema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  relationship_type: z.enum([
    "Friend",
    "Family",
    "Colleague",
    "Classmate",
    "Crush",
    "Ex",
    "Mentor",
    "Other",
  ]),
  bio: z.string(),
  profession: z.string(),
  long_term_goals: z.string(),
  birthday: z.string(),
  music_preference: z.string(),
  favorite_movie: z.string(),
  favorite_book: z.string(),
  favorite_memory: z.string(),
  notes: z.string(),
  // id and profile_id must be included so Zod (strip mode) doesn't discard them on submit.
  // GORM uses id for ON CONFLICT upserts — losing it causes duplicate rows on every update.
  tags: z.array(
    z.object({ id: z.number().optional(), profile_id: z.number().optional(), tag: z.string() })
  ),
  top_songs: z
    .array(
      z.object({
        id: z.number().optional(),
        profile_id: z.number().optional(),
        name: z.string(),
        artist: z.string(),
      })
    )
    .max(3, "Max 3 top songs"),
  quotes: z.array(
    z.object({ id: z.number().optional(), profile_id: z.number().optional(), quote: z.string() })
  ),
  movie_genres: z.array(
    z.object({ id: z.number().optional(), profile_id: z.number().optional(), genre: z.string() })
  ),
  book_genres: z.array(
    z.object({ id: z.number().optional(), profile_id: z.number().optional(), genre: z.string() })
  ),
  hangout_places: z.array(
    z.object({ id: z.number().optional(), profile_id: z.number().optional(), place: z.string() })
  ),
  food_restrictions: z.array(
    z.object({
      id: z.number().optional(),
      profile_id: z.number().optional(),
      restriction: z.string(),
    })
  ),
  political_views: z.array(
    z.object({ id: z.number().optional(), profile_id: z.number().optional(), view: z.string() })
  ),
  associated_song_name: z.string(),
  associated_song_artist: z.string(),
});

export default function ProfileForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
}: {
  initialValues: ProfileFormValues;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  // keyName "_key" avoids RHF overwriting the data's own "id" field with its internal UUID.
  const tagsField = useFieldArray({ control, name: "tags", keyName: "_key" });
  const quotesField = useFieldArray({ control, name: "quotes", keyName: "_key" });
  const movieGenresField = useFieldArray({ control, name: "movie_genres", keyName: "_key" });
  const bookGenresField = useFieldArray({ control, name: "book_genres", keyName: "_key" });
  const hangoutPlacesField = useFieldArray({ control, name: "hangout_places", keyName: "_key" });
  const foodRestrictionsField = useFieldArray({
    control,
    name: "food_restrictions",
    keyName: "_key",
  });
  const politicalViewsField = useFieldArray({ control, name: "political_views", keyName: "_key" });
  const songsField = useFieldArray({ control, name: "top_songs", keyName: "_key" });
  const songNameInputRef = useRef<HTMLInputElement>(null);
  const songArtistInputRef = useRef<HTMLInputElement>(null);

  const songs = useWatch({ control, name: "top_songs" });

  const addTopSong = () => {
    const name = songNameInputRef.current?.value.trim() ?? "";
    const artist = songArtistInputRef.current?.value.trim() ?? "";
    if (!name || !artist) return;

    songsField.append({ name, artist });

    if (songNameInputRef.current) songNameInputRef.current.value = "";
    if (songArtistInputRef.current) songArtistInputRef.current.value = "";
    songNameInputRef.current?.focus();
  };

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 140, damping: 22 }}
    >
      <ProfileFormSection id="basic" title="Basic Information" icon={User} index={0}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Input label="Full Name" {...register("full_name")} error={errors.full_name?.message} />

          <div>
            <label
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--text-3)" }}
            >
              Relationship Type
            </label>
            <div className="relative">
              <select
                {...register("relationship_type")}
                className="glass-input w-full appearance-none rounded-xl border border-(--color-border-subtle) px-4 py-3 pr-10"
              >
                <option value="Friend">Friend</option>
                <option value="Family">Family</option>
                <option value="Colleague">Colleague</option>
                <option value="Classmate">Classmate</option>
                <option value="Crush">Crush</option>
                <option value="Ex">Ex</option>
                <option value="Mentor">Mentor</option>
                <option value="Other">Other</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: "var(--text-3)" }}
              />
            </div>
          </div>

          <Input label="Birthday" type="date" {...register("birthday")} />
          <Input label="Profession" {...register("profession")} />

          <div className="md:col-span-2">
            <label
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--text-3)" }}
            >
              Bio
            </label>
            <textarea
              {...register("bio")}
              className="glass-input h-32 w-full resize-none rounded-xl p-4 focus:outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <FieldArrayInput
              label="Tags"
              placeholder="Type a tag and hit Enter"
              fieldKey="tag"
              items={tagsField.fields}
              append={tagsField.append}
              remove={tagsField.remove}
            />
          </div>
        </div>
      </ProfileFormSection>

      <ProfileFormSection id="interests" title="Interests & Favorites" icon={Star} index={1}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Input label="Music Preference" {...register("music_preference")} />
          <Input label="Favorite Movie" {...register("favorite_movie")} />
          <Input label="Favorite Book" {...register("favorite_book")} />

          <div
            className="md:col-span-2 rounded-xl border p-4"
            style={{ background: "var(--fill)", borderColor: "var(--border)" }}
          >
            <h3
              className="mb-4 flex items-center gap-2 text-sm font-semibold"
              style={{ color: "var(--text-2)" }}
            >
              <Heart className="h-4 w-4" style={{ color: "var(--text-3)" }} /> Song Association
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input placeholder="Song Name" {...register("associated_song_name")} />
              <Input placeholder="Artist" {...register("associated_song_artist")} />
            </div>
          </div>

          <div className="md:col-span-2">
            <label
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--text-3)" }}
            >
              Top Songs
            </label>
            <div className="space-y-2">
              {songsField.fields.map((field, index) => (
                <div
                  key={field._key}
                  className="flex items-center justify-between rounded-lg border p-3"
                  style={{ background: "var(--fill)", borderColor: "var(--border)" }}
                >
                  <div>
                    <div className="font-medium text-sm" style={{ color: "var(--text-1)" }}>
                      {songs[index]?.name || "Untitled"}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-3)" }}>
                      {songs[index]?.artist}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => songsField.remove(index)}
                    aria-label="Remove song"
                  >
                    <Trash2
                      className="h-4 w-4"
                      aria-hidden="true"
                      style={{ color: "var(--red)" }}
                    />
                  </button>
                </div>
              ))}
            </div>
            {errors.top_songs?.message && (
              <p className="mt-1 text-sm" style={{ color: "var(--red)" }}>
                {errors.top_songs.message}
              </p>
            )}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                ref={songNameInputRef}
                placeholder="song name"
                disabled={songs.length >= 3}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTopSong();
                  }
                }}
                className="glass-input w-full rounded-xl px-4 py-3 disabled:opacity-40"
              />
              <input
                ref={songArtistInputRef}
                placeholder="artist"
                disabled={songs.length >= 3}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTopSong();
                  }
                }}
                className="glass-input w-full rounded-xl px-4 py-3 disabled:opacity-40"
              />
              <button
                type="button"
                onClick={addTopSong}
                disabled={songs.length >= 3}
                aria-label="Add song"
                className="rounded-xl px-3 border transition-colors hover:bg-(--fill-hover) active:scale-[0.97] sm:shrink-0 disabled:opacity-40"
                style={{
                  background: "var(--fill)",
                  borderColor: "var(--border)",
                  color: "var(--text-2)",
                }}
              >
                <Plus className="h-5 w-5 mx-auto" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </ProfileFormSection>

      <ProfileFormSection id="lifestyle" title="Lifestyle" icon={Coffee} index={2}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FieldArrayInput
            label="Hangout Places"
            placeholder="Add place"
            fieldKey="place"
            items={hangoutPlacesField.fields}
            append={hangoutPlacesField.append}
            remove={hangoutPlacesField.remove}
          />
          <FieldArrayInput
            label="Food Restrictions"
            placeholder="Add restriction"
            fieldKey="restriction"
            items={foodRestrictionsField.fields}
            append={foodRestrictionsField.append}
            remove={foodRestrictionsField.remove}
          />
          <FieldArrayInput
            label="Movie Genres"
            placeholder="Add genre"
            fieldKey="genre"
            items={movieGenresField.fields}
            append={movieGenresField.append}
            remove={movieGenresField.remove}
          />
          <FieldArrayInput
            label="Book Genres"
            placeholder="Add genre"
            fieldKey="genre"
            items={bookGenresField.fields}
            append={bookGenresField.append}
            remove={bookGenresField.remove}
          />
        </div>
      </ProfileFormSection>

      <ProfileFormSection id="deep" title="Deep Dive" icon={MessageSquare} index={3}>
        <div className="space-y-6">
          <div>
            <label
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--text-3)" }}
            >
              Long Term Goals
            </label>
            <textarea
              {...register("long_term_goals")}
              className="glass-input h-24 w-full resize-none rounded-xl p-4 focus:outline-none"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--text-3)" }}
            >
              Favorite Memory
            </label>
            <textarea
              {...register("favorite_memory")}
              className="glass-input h-32 w-full resize-none rounded-xl p-4 focus:outline-none"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--text-3)" }}
            >
              Additional Notes
            </label>
            <textarea
              {...register("notes")}
              placeholder="Anything else worth remembering..."
              className="glass-input h-32 w-full resize-none rounded-xl p-4 focus:outline-none"
            />
          </div>

          <FieldArrayInput
            label="Quotes"
            placeholder="Add quote"
            fieldKey="quote"
            items={quotesField.fields}
            append={quotesField.append}
            remove={quotesField.remove}
            variant="block"
          />
          <FieldArrayInput
            label="Political Views"
            placeholder="Add view"
            fieldKey="view"
            items={politicalViewsField.fields}
            append={politicalViewsField.append}
            remove={politicalViewsField.remove}
          />
        </div>
      </ProfileFormSection>

      <div className="sticky bottom-4 z-20">
        <div className="glass-panel flex items-center justify-end rounded-2xl p-2.5">
          <Button type="submit" isLoading={isSubmitting} className="w-full px-8! sm:w-auto">
            <Save className="mr-2 h-4 w-4" aria-hidden="true" /> {submitLabel}
          </Button>
        </div>
      </div>
    </motion.form>
  );
}
