import { Plus, X } from "lucide-react";
import { useState } from "react";
import type {
  FieldArray,
  FieldArrayWithId,
  UseFieldArrayAppend,
  UseFieldArrayRemove,
} from "react-hook-form";
import type { ProfileFormValues } from "@/shared/types/profile";

type ArrayFieldName =
  | "tags"
  | "quotes"
  | "movie_genres"
  | "book_genres"
  | "hangout_places"
  | "food_restrictions"
  | "political_views";

export default function FieldArrayInput<TFieldName extends ArrayFieldName>({
  label,
  placeholder,
  fieldKey,
  items,
  append,
  remove,
  badgeClassName = "bg-white/10",
}: {
  label: string;
  placeholder: string;
  fieldKey: string;
  items: FieldArrayWithId<ProfileFormValues, TFieldName, "id">[];
  append: UseFieldArrayAppend<ProfileFormValues, TFieldName>;
  remove: UseFieldArrayRemove;
  badgeClassName?: string;
}) {
  const [value, setValue] = useState("");

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
        {label}
      </label>
      <div className="mb-2 flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span
            key={item.id}
            className={`flex items-center gap-2 rounded-lg px-3 py-1 text-sm ${badgeClassName}`}
          >
            {String((item as Record<string, unknown>)[fieldKey] ?? "")}
            <button type="button" onClick={() => remove(index)}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!value.trim()) return;
              append({ [fieldKey]: value.trim() } as FieldArray<ProfileFormValues, TFieldName>);
              setValue("");
            }
          }}
          placeholder={placeholder}
          className="glass-input w-full rounded-xl px-4 py-3"
        />
        <button
          type="button"
          onClick={() => {
            if (!value.trim()) return;
            append({ [fieldKey]: value.trim() } as FieldArray<ProfileFormValues, TFieldName>);
            setValue("");
          }}
          className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
