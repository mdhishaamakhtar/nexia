import { Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useId, useState } from "react";
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
  | "favorite_memories"
  | "movie_genres"
  | "book_genres"
  | "hangout_places"
  | "food_restrictions"
  | "political_views";

const SPRING = { type: "spring", stiffness: 380, damping: 30 } as const;

export default function FieldArrayInput<TFieldName extends ArrayFieldName>({
  label,
  placeholder,
  fieldKey,
  items,
  append,
  remove,
  variant = "chip",
}: {
  label: string;
  placeholder: string;
  fieldKey: string;
  items: FieldArrayWithId<ProfileFormValues, TFieldName, "_key">[];
  append: UseFieldArrayAppend<ProfileFormValues, TFieldName>;
  remove: UseFieldArrayRemove;
  // "chip":  short tokens rendered as inline pills (tags, genres, places…)
  // "block": arbitrary-length content as full-width rows (quotes, memories)
  variant?: "chip" | "block";
}) {
  const [value, setValue] = useState("");
  const inputId = useId();

  const addValue = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    append({ [fieldKey]: trimmed } as FieldArray<ProfileFormValues, TFieldName>);
    setValue("");
  };

  return (
    <div>
      <label htmlFor={inputId} className="t-label mb-2 block">
        {label}
      </label>

      {items.length > 0 && (
        <ul
          className={
            variant === "block" ? "mb-2.5 flex flex-col gap-2" : "mb-2.5 flex flex-wrap gap-2"
          }
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((item, index) => {
              const text = String((item as Record<string, unknown>)[fieldKey] ?? "");

              if (variant === "block") {
                return (
                  <motion.li
                    key={item._key}
                    layout
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={SPRING}
                    className="paper-sunk flex w-full items-start gap-3 rounded-xl px-4 py-3"
                  >
                    <span
                      className="min-w-0 flex-1 break-words text-sm leading-relaxed"
                      style={{ color: "var(--text-2)" }}
                    >
                      {text}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label={`Remove ${text}`}
                      className="-mr-1.5 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-(--surface-3)"
                      style={{ color: "var(--text-3)" }}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </motion.li>
                );
              }

              return (
                <motion.li
                  key={item._key}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={SPRING}
                  className="sticker-chip inline-flex max-w-full items-center gap-1 py-1 pl-3 pr-1 text-sm"
                >
                  <span className="min-w-0 break-words">{text}</span>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={`Remove ${text}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-(--surface-3)"
                    style={{ color: "var(--text-3)" }}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}

      <div className="flex gap-2">
        <input
          id={inputId}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addValue();
            }
          }}
          placeholder={placeholder}
          className="field min-w-0 flex-1 px-4 py-3"
        />
        <button
          type="button"
          aria-label={`Add ${label.toLowerCase()}`}
          onClick={addValue}
          disabled={!value.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors hover:bg-(--surface-2) active:scale-95 disabled:opacity-40"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--text-2)",
          }}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
