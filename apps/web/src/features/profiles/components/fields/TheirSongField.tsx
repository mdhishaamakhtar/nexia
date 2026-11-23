"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import Input from "@/components/atoms/Input";
import type { ProfileFormValues } from "../../form";

/**
 * The one song someone is bound to: a title and, if you remember it, who
 * sings it. Two fields under one label.
 */
export default function TheirSongField({
  register,
  errors,
  hideLabel = false,
}: {
  register: UseFormRegister<ProfileFormValues>;
  errors: FieldErrors<ProfileFormValues>;
  /** Keep the legend for screen readers only: the section heading says it. */
  hideLabel?: boolean;
}) {
  return (
    <fieldset>
      <legend className={hideLabel ? "sr-only" : "t-label mb-2"}>Their song</legend>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input
          placeholder="Song name"
          aria-label="Their song: name"
          error={errors.associated_song?.name?.message}
          {...register("associated_song.name")}
        />
        <Input
          placeholder="Artist (optional)"
          aria-label="Their song: artist"
          {...register("associated_song.artist")}
        />
      </div>
    </fieldset>
  );
}
