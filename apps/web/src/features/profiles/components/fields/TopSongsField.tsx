"use client";

import { useId } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useController, useFieldArray, type Control } from "react-hook-form";
import { MAX_TOP_SONGS } from "@nexia/shared";
import { cn } from "@/lib/utils";
import type { ProfileFormValues } from "../../form";

/**
 * A ranked top three. The rank badges match the sheet, so the order set here
 * is the order you will recognise; the arrows change it. A song needs a name;
 * the artist is optional. Half-typed input is saved with the profile, like
 * every other list.
 */
export default function TopSongsField({ control }: { control: Control<ProfileFormValues> }) {
  const nameId = useId();
  const { fields, append, remove, swap } = useFieldArray({ control, name: "top_songs" });
  const { field: draftName, fieldState: nameState } = useController({
    control,
    name: "drafts.song_name",
  });
  const { field: draftArtist } = useController({ control, name: "drafts.song_artist" });

  const full = fields.length >= MAX_TOP_SONGS;

  const add = () => {
    const name = draftName.value.trim();
    if (!name) return;
    append({ name, artist: draftArtist.value.trim() });
    draftName.onChange("");
    draftArtist.onChange("");
    document.getElementById(nameId)?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      add();
    }
  };

  return (
    <fieldset>
      <legend className="t-label mb-2">Top songs</legend>

      {fields.length > 0 && (
        <ol className="mb-3 space-y-2">
          {fields.map((field, index) => (
            <li
              key={field.id}
              className="flex items-center gap-3 rounded-[1.25rem] bg-surface py-1 pl-3.5 pr-1"
            >
              <span
                className="flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-full bg-p text-sm font-bold text-p-ink"
                aria-label={`Number ${index + 1}`}
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-text-1">{field.name}</p>
                {field.artist && <p className="truncate text-sm text-text-2">{field.artist}</p>}
              </div>
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => swap(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move ${field.name} up`}
                  className="flex h-11 w-9 cursor-pointer items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1 disabled:invisible"
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => swap(index, index + 1)}
                  disabled={index === fields.length - 1}
                  aria-label={`Move ${field.name} down`}
                  className="flex h-11 w-9 cursor-pointer items-center justify-center rounded-full text-text-2 transition-colors hover:bg-surface-2 hover:text-text-1 disabled:invisible"
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label={`Remove ${field.name}`}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-red-ink transition-colors hover:bg-red-bg"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {full ? (
        <p className="text-sm text-text-2">
          That&apos;s all {MAX_TOP_SONGS}. Remove one to swap it out.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={nameId}
              value={draftName.value}
              onChange={(e) => draftName.onChange(e.target.value)}
              onBlur={draftName.onBlur}
              onKeyDown={onKeyDown}
              placeholder="Song name"
              aria-label="Top song name"
              aria-invalid={nameState.error ? true : undefined}
              className={cn("field min-w-0 flex-1 px-4 py-2.5", nameState.error && "field-error")}
            />
            <input
              value={draftArtist.value}
              onChange={(e) => draftArtist.onChange(e.target.value)}
              onBlur={draftArtist.onBlur}
              onKeyDown={onKeyDown}
              placeholder="Artist (optional)"
              aria-label="Top song artist"
              className="field min-w-0 flex-1 px-4 py-2.5"
            />
            <button
              type="button"
              onClick={add}
              disabled={!draftName.value.trim()}
              className="flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-text-1 px-5 text-base font-semibold text-white transition-[background-color,transform] active:scale-95 disabled:cursor-default disabled:bg-surface-3 disabled:text-text-3 sm:w-12 sm:px-0"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              <span className="sm:sr-only">Add song</span>
            </button>
          </div>
          {nameState.error && (
            <p role="alert" className="mt-2 text-sm font-semibold text-red-ink">
              {nameState.error.message}
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}
