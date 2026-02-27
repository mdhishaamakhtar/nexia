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
}: {
  label: string;
  placeholder: string;
  fieldKey: string;
  items: FieldArrayWithId<ProfileFormValues, TFieldName, "id">[];
  append: UseFieldArrayAppend<ProfileFormValues, TFieldName>;
  remove: UseFieldArrayRemove;
  badgeClassName?: string; // optional; falls back to CSS-var-based styling
}) {
  const [value, setValue] = useState("");

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
        {label}
      </label>
      <div className="mb-2 flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <motion.span
              key={item.id}
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              className={`sticker-chip flex items-center gap-2 rounded-full px-3 py-1 text-sm border ${badgeClassName ?? ""}`}
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
              {String((item as Record<string, unknown>)[fieldKey] ?? "")}
              <button
                type="button"
                onClick={() => remove(index)}
                className="hover:rotate-90 transition-transform"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
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
          className="rounded-xl px-3 border transition-colors"
          style={{
            background: "var(--fill)",
            borderColor: "var(--border)",
            color: "var(--text-2)",
          }}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
