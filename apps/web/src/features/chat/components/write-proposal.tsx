"use client";

import { Check, Loader2 } from "lucide-react";
import { MAX_TOP_SONGS, type ProfileListField } from "@nexia/shared";
import Button from "@/components/atoms/Button";
import Tape from "@/components/atoms/Tape";
import { formatDate } from "@/shared/lib/dates";
import { FIELD_LABELS } from "@/features/profiles/sections";

type ProfileDraft = Record<string, unknown>;

const LIST_FIELDS: ReadonlySet<string> = new Set<ProfileListField>([
  "tags",
  "political_views",
  "food_restrictions",
  "movie_genres",
  "book_genres",
  "hangout_places",
  "quotes",
  "favorite_memories",
]);

const LABELS: Record<string, string> = {
  ...FIELD_LABELS,
  full_name: "Name",
  pronouns: "Pronouns",
  relationship_type: "Relationship",
  bio: "Bio",
};

function describe(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "")
    return key === "birthday" ? "(cleared)" : null;
  if (key === "birthday" && typeof value === "string") return formatDate(value, "long") ?? value;
  if (LIST_FIELDS.has(key) && Array.isArray(value))
    return value.length ? value.join(", ") : "(cleared)";
  if (key === "top_songs" && Array.isArray(value)) {
    return value
      .slice(0, MAX_TOP_SONGS)
      .map(
        (s: { name?: string; artist?: string }, i) =>
          `${i + 1}. ${s.name ?? ""}${s.artist ? ` by ${s.artist}` : ""}`
      )
      .join("  ");
  }
  if (key === "associated_song" && typeof value === "object") {
    const s = value as { name?: string; artist?: string };
    return `${s.name ?? ""}${s.artist ? ` by ${s.artist}` : ""}`;
  }
  return String(value);
}

/**
 * The agent wants to save something. Nothing is written until the person
 * presses Save — the server refuses to run a write tool without this answer —
 * and the card shows exactly what would be saved, field by field.
 *
 * Drawn as a pinned note in the thread, the same family as the dialogs.
 */
export function WriteProposal({
  kind,
  input,
  state,
  onRespond,
}: {
  kind: "create" | "update";
  input: unknown;
  state: "approval-requested" | "approval-responded" | "input-available" | "input-streaming";
  onRespond: (approved: boolean) => void;
}) {
  const draft = ((kind === "update" ? (input as { profile?: ProfileDraft })?.profile : input) ??
    {}) as ProfileDraft;
  const rows = Object.entries(draft)
    .map(([key, value]) => [LABELS[key] ?? key, describe(key, value)] as const)
    .filter((row): row is readonly [string, string] => row[1] !== null);
  const name = typeof draft.full_name === "string" ? draft.full_name : null;
  const waiting = state === "approval-requested";

  return (
    <div className="relative w-full max-w-md rounded-2xl border-[1.5px] border-line-float bg-surface px-5 pb-4 pt-6">
      <Tape color="peach" width={64} height={18} tilt={-2} />
      <p className="t-label mb-1">
        {kind === "create" ? "Add to your slambook" : "Update a profile"}
      </p>
      <p className="t-section-title break-words text-text-1">
        {kind === "create"
          ? (name ?? "New profile")
          : name
            ? `Change ${name}`
            : "Save these changes"}
      </p>

      {rows.length > 0 && (
        <dl className="mt-3 space-y-2 border-t border-line pt-3">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 text-sm">
              <dt className="t-label pt-0.5">{label}</dt>
              <dd className="break-words text-text-1">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {waiting ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => onRespond(false)}>
              Not now
            </Button>
            <Button size="sm" onClick={() => onRespond(true)}>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Save
            </Button>
          </>
        ) : (
          <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-text-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {state === "approval-responded" ? "Saving…" : "Getting the details ready…"}
          </p>
        )}
      </div>
    </div>
  );
}
