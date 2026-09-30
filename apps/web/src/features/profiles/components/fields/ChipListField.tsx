"use client";

import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useController, type Control } from "react-hook-form";
import type { ProfileListField } from "@nexia/shared";
import { cn } from "@/lib/utils";
import { SETTLE } from "@/shared/ui/motion";
import { withItem, type ProfileFormValues } from "../../form";

/**
 * A list field: what is already there as removable chips (or rows, for
 * quotes and memories), and a box to add one more.
 *
 * The box is a form field in its own right (`drafts.<name>`). Typing in it
 * makes the form dirty, and saving folds whatever is there into the list — so
 * a tag typed and never Entered is kept, not silently dropped as it used to be.
 */
export default function ChipListField({
  control,
  name,
  label,
  placeholder,
  kind = "neutral",
}: {
  control: Control<ProfileFormValues>;
  name: ProfileListField;
  label: string;
  placeholder: string;
  /** What the list holds, which decides its colour: tags are lavender, quotes
   *  keep their hanging mark, plain facts stay neutral paper. */
  kind?: "neutral" | "tag" | "quote" | "memory";
}) {
  const inputId = useId();
  const hintId = useId();
  const { field: list } = useController({ control, name });
  const { field: draft, fieldState } = useController({
    control,
    name: `drafts.${name}` as `drafts.${ProfileListField}`,
  });

  const items = list.value as string[];
  const isBlock = kind === "quote" || kind === "memory";

  const add = () => {
    if (!draft.value.trim()) return;
    list.onChange(withItem(items, draft.value));
    draft.onChange("");
  };
  const removeAt = (index: number) => list.onChange(items.filter((_, i) => i !== index));

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft.value && items.length > 0 && !isBlock) {
      // An empty box and Backspace takes the last chip back, as in most tag inputs.
      removeAt(items.length - 1);
    }
  };

  const inputProps = {
    id: inputId,
    value: draft.value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      draft.onChange(e.target.value),
    onBlur: draft.onBlur,
    onKeyDown,
    placeholder,
    "aria-describedby": hintId,
    "aria-invalid": fieldState.error ? true : undefined,
    className: cn("field min-w-0 flex-1 px-4 py-3", fieldState.error && "field-error"),
  };

  return (
    <div>
      <label htmlFor={inputId} className="t-label mb-2 block">
        {label}
      </label>

      {items.length > 0 && (
        <ul
          aria-label={label}
          className={isBlock ? "mb-2.5 flex flex-col gap-2" : "mb-2.5 flex flex-wrap gap-2"}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {items.map((item, index) => (
              <motion.li
                key={item}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={SETTLE}
                className={cn(
                  isBlock
                    ? "relative flex w-full items-start gap-3 rounded-xl border py-3 pr-2 text-sm leading-relaxed text-text-2"
                    : "inline-flex max-w-full items-center gap-1 py-1 pl-3 pr-1 text-sm",
                  kind === "quote" && "border-lavender-line bg-lavender-soft pl-11",
                  kind === "memory" && "border-line bg-surface-2 pl-4",
                  kind === "tag" && "sticker-tag",
                  kind === "neutral" && "sticker-chip"
                )}
              >
                {kind === "quote" && (
                  <span
                    aria-hidden="true"
                    className="t-section-title pointer-events-none absolute left-3.5 top-2 select-none leading-none text-lavender-ink/40"
                  >
                    &ldquo;
                  </span>
                )}
                <span
                  className={cn("min-w-0 break-words", isBlock && "flex-1 whitespace-pre-line")}
                >
                  {kind === "tag" ? `#${item}` : item}
                </span>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  aria-label={`Remove ${item}`}
                  className={cn(
                    "hit-44 flex shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-3",
                    isBlock ? "h-8 w-8 text-text-3" : "h-7 w-7",
                    kind === "tag" ? "text-lavender-ink" : "text-text-3"
                  )}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <div className="flex items-stretch gap-2">
        {isBlock ? (
          <textarea
            rows={2}
            {...inputProps}
            className={cn(inputProps.className, "resize-y leading-relaxed")}
          />
        ) : (
          <input {...inputProps} />
        )}
        <button
          type="button"
          aria-label={`Add to ${label.toLowerCase()}`}
          onClick={add}
          disabled={!draft.value.trim()}
          className="flex w-11 shrink-0 items-center justify-center rounded-xl border border-field-line bg-surface text-text-2 transition-colors hover:bg-surface-2 disabled:border-line disabled:text-text-3"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <p
        id={hintId}
        className={cn(
          "mt-1.5 text-xs",
          fieldState.error ? "font-semibold text-red-ink" : "text-text-3"
        )}
      >
        {fieldState.error?.message ??
          (isBlock
            ? "Enter to add · Shift+Enter for a new line"
            : "Enter to add · saved with the profile")}
      </p>
    </div>
  );
}
