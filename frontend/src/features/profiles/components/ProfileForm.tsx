"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Coffee, Heart, MessageSquare, Save, Star, Trash2, User } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
  tags: z.array(z.object({ tag: z.string() })),
  top_songs: z.array(z.object({ name: z.string(), artist: z.string() })).max(3, "Max 3 top songs"),
  quotes: z.array(z.object({ quote: z.string() })),
  movie_genres: z.array(z.object({ genre: z.string() })),
  book_genres: z.array(z.object({ genre: z.string() })),
  hangout_places: z.array(z.object({ place: z.string() })),
  food_restrictions: z.array(z.object({ restriction: z.string() })),
  political_views: z.array(z.object({ view: z.string() })),
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
    watch,
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const tagsField = useFieldArray({ control, name: "tags" });
  const quotesField = useFieldArray({ control, name: "quotes" });
  const movieGenresField = useFieldArray({ control, name: "movie_genres" });
  const bookGenresField = useFieldArray({ control, name: "book_genres" });
  const hangoutPlacesField = useFieldArray({ control, name: "hangout_places" });
  const foodRestrictionsField = useFieldArray({ control, name: "food_restrictions" });
  const politicalViewsField = useFieldArray({ control, name: "political_views" });
  const songsField = useFieldArray({ control, name: "top_songs" });

  const songs = watch("top_songs");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting} className="!px-8">
          <Save className="mr-2 h-4 w-4" /> {submitLabel}
        </Button>
      </div>

      <ProfileFormSection id="basic" title="Basic Information" icon={User}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Input label="Full Name" {...register("full_name")} error={errors.full_name?.message} />

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
              Relationship Type
            </label>
            <select
              {...register("relationship_type")}
              className="glass-input w-full rounded-xl border border-[var(--color-border-subtle)] px-4 py-3"
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
          </div>

          <Input label="Birthday" type="date" {...register("birthday")} />
          <Input label="Profession" {...register("profession")} />

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
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
              badgeClassName="border border-indigo-500/30 bg-indigo-500/20 text-indigo-300"
            />
          </div>
        </div>
      </ProfileFormSection>

      <ProfileFormSection id="interests" title="Interests & Favorites" icon={Star}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Input label="Music Preference" {...register("music_preference")} />
          <Input label="Favorite Movie" {...register("favorite_movie")} />
          <Input label="Favorite Book" {...register("favorite_book")} />

          <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-medium">
              <Heart className="h-4 w-4 text-rose-400" /> Song Association
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input placeholder="Song Name" {...register("associated_song_name")} />
              <Input placeholder="Artist" {...register("associated_song_artist")} />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
              Top Songs (max 3)
            </label>
            <div className="space-y-2">
              {songsField.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div>
                    <div className="font-medium">{songs[index]?.name || "Untitled"}</div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      {songs[index]?.artist}
                    </div>
                  </div>
                  <button type="button" onClick={() => songsField.remove(index)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
            {errors.top_songs?.message && (
              <p className="mt-1 text-sm text-red-400">{errors.top_songs.message}</p>
            )}
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              <Input
                placeholder="Song Name"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const currentTarget = e.currentTarget;
                  const artistInput = document.getElementById(
                    "song-artist-input"
                  ) as HTMLInputElement;
                  if (!currentTarget.value.trim() || !artistInput?.value.trim()) return;
                  songsField.append({
                    name: currentTarget.value.trim(),
                    artist: artistInput.value.trim(),
                  });
                  currentTarget.value = "";
                  artistInput.value = "";
                }}
              />
              <Input id="song-artist-input" placeholder="Artist" />
            </div>
          </div>
        </div>
      </ProfileFormSection>

      <ProfileFormSection id="lifestyle" title="Lifestyle" icon={Coffee}>
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
            badgeClassName="border border-rose-500/20 bg-rose-500/10 text-rose-300"
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

      <ProfileFormSection id="deep" title="Deep Dive" icon={MessageSquare}>
        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
              Long Term Goals
            </label>
            <textarea
              {...register("long_term_goals")}
              className="glass-input h-24 w-full resize-none rounded-xl p-4 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
              Favorite Memory
            </label>
            <textarea
              {...register("favorite_memory")}
              className="glass-input h-32 w-full resize-none rounded-xl p-4 font-serif text-lg focus:outline-none"
            />
          </div>

          <FieldArrayInput
            label="Quotes"
            placeholder="Add quote"
            fieldKey="quote"
            items={quotesField.fields}
            append={quotesField.append}
            remove={quotesField.remove}
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
    </form>
  );
}
