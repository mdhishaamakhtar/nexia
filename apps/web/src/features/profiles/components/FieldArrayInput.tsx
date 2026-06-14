import { Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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
  | "favorite_memories"
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
  badgeClassName,
  variant = "chip",
}: {
  label: string;
  placeholder: string;
  fieldKey: string;
  items: FieldArrayWithId<ProfileFormValues, TFieldName, "_key">[];
  append: UseFieldArrayAppend<ProfileFormValues, TFieldName>;
  remove: UseFieldArrayRemove;
  badgeClassName?: string; // optional; falls back to CSS-var-based styling
  // "chip": short tokens rendered as inline pills (tags, genres, places…)
  // "block": arbitrary-length content rendered as full-width wrapping rows (quotes)
  variant?: "chip" | "block";
}) {
  const [value, setValue] = useState("");

  const addValue = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    append({ [fieldKey]: trimmed } as FieldArray<ProfileFormValues, TFieldName>);
    setValue("");
  };

  return (
    <div>
      <label
        className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--text-3)" }}
      >
        {label}
      </label>

      {items.length > 0 && (
        <div
          className={variant === "block" ? "mb-2 flex flex-col gap-2" : "mb-2 flex flex-wrap gap-2"}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((item, index) => {
              const text = String((item as Record<string, unknown>)[fieldKey] ?? "");

              if (variant === "block") {
                return (
                  <motion.div
                    key={item._key}
                    layout
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="flex w-full items-start gap-3 rounded-xl border px-4 py-3"
                    style={{
                      background: "var(--fill)",
                      borderColor: "var(--border)",
                      color: "var(--text-2)",
                    }}
                  >
                    <span className="min-w-0 flex-1 break-words text-sm leading-relaxed">
                      {text}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label="Remove"
                      className="mt-0.5 shrink-0 rounded-full p-1 transition-colors hover:bg-(--fill-hover)"
                      style={{ color: "var(--text-3)" }}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </motion.div>
                );
              }

              return (
                <motion.span
                  key={item._key}
                  layout
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.85, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 26 }}
                  className={`sticker-chip inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1 text-sm border ${badgeClassName ?? ""}`}
                  style={
                    !badgeClassName
                      ? {
                          background: "var(--fill)",
                          borderColor: "var(--border)",
                          color: "var(--text-2)",
                        }
                      : undefined
                  }
                >
                  <span className="min-w-0 break-words">{text}</span>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label="Remove"
                    className="shrink-0 transition-transform hover:rotate-90"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </motion.span>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addValue();
            }
          }}
          placeholder={placeholder}
          className="glass-input w-full rounded-xl px-4 py-3"
        />
        <button
          type="button"
          aria-label="Add"
          onClick={addValue}
          className="rounded-xl px-3 border transition-colors hover:bg-(--fill-hover) active:scale-[0.97]"
          style={{
            background: "var(--fill)",
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
