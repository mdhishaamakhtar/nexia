"use client";

import { Check, Loader2 } from "lucide-react";
import { MAX_TOP_SONGS, type ProfileListField } from "@nexia/shared";
import Button from "@/components/atoms/Button";
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
 * Drawn as a white card with a line round it: the one thing in the thread
 * that is waiting on an answer.
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
    <div className="w-full max-w-lg rounded-[1.75rem] border-[1.5px] border-line-float bg-surface p-5 sm:p-6">
      <p className="t-section-title break-words text-text-1">
        {kind === "create"
          ? (name ?? "New profile")
          : name
            ? `Change ${name}`
            : "Save these changes"}
      </p>

      {rows.length > 0 && (
        <dl className="mt-4 divide-y-[1.5px] divide-line">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-2.5 text-[0.9375rem] first:pt-0"
            >
              <dt className="text-text-3">{label}</dt>
              <dd className="break-words font-semibold text-text-1">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {/* What Save will do, said beside the button that does it. */}
        <p className="text-[0.9375rem] font-semibold text-text-2">
          {kind === "create" ? "Add to your slambook" : "Update a profile"}
        </p>
        {waiting ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onRespond(false)}>
              Not now
            </Button>
            <Button size="sm" className="px-5" onClick={() => onRespond(true)}>
              <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
              Save
            </Button>
          </div>
        ) : (
          <p className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-text-3">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {state === "approval-responded" ? "Saving…" : "Getting the details ready…"}
          </p>
        )}
      </div>
    </div>
  );
}
