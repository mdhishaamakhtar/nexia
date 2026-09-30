"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import Input from "@/components/atoms/Input";
import type { ProfileFormValues } from "../../form";

/**
 * The peach well from the sheet, in its editable state. The fields inside stay
 * white — a hole punched in the well, not a tinted box on a tinted box.
 */
export default function TheirSongField({
  register,
  errors,
}: {
  register: UseFormRegister<ProfileFormValues>;
  errors: FieldErrors<ProfileFormValues>;
}) {
  return (
    <fieldset className="rounded-2xl border border-peach-line bg-peach-soft px-4 pb-4 pt-3.5">
      <legend className="sr-only">Their song</legend>
      <p className="t-label mb-3 text-peach-ink" aria-hidden="true">
        Their song
      </p>
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
