"use client";

import { X } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * The expanded view of a quote or a memory.
 *
 * It is deliberately the *same object* you tapped, with the clamp removed —
 * not a generic dialog wrapped around the text. The previous version set the
 * passage at 20/24px, a size that exists nowhere in the type ramp, and gave a
 * quote and a memory identical chrome, which flattened the one distinction the
 * profile sheet works hardest to make: a quote is speech, a memory is yours.
 *
 * So a quote opens as the lavender bubble it already was, hanging mark and all.
 * A memory opens as the plain paper well it already was. Both set the passage
 * in `.t-body`, the documented step for profile prose; the room, not the point
 * size, is what the modal adds.
 */
export default function QuoteModal({
  quote,
  onClose,
  variant = "quote",
  title,
}: {
  quote: string;
  onClose: () => void;
  variant?: "quote" | "memory";
  title?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const isQuote = variant === "quote";
  const heading = title ?? (isQuote ? "words they said" : "a memory worth keeping");

  // Move focus into the dialog on open and hand it back on close, and keep Tab
  // inside while it is up. Escape already closed it; nothing was managing where
  // the keyboard actually was.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "var(--overlay)" }}
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
        // Same 16px radius and fill as the bubble on the sheet, so this reads
        // as that card enlarged rather than a different component.
        //
        // The border is the one thing that cannot be copied across. A card's
        // hairline reads because it is darker than its fill *and* darker than
        // the paper behind it; on the scrim that second condition fails, and
        // the line dissolves into the card's silhouette. Hence the float line
        // and 2px — see the token block in globals.css.
        className="flex max-h-[80dvh] w-full max-w-xl flex-col rounded-2xl border-2"
        style={
          isQuote
            ? { background: "var(--lavender-soft)", borderColor: "var(--lavender-line-float)" }
            : { background: "var(--surface-2)", borderColor: "var(--line-float)" }
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-6 sm:px-8 sm:pt-8">
          <h2 className="t-label" style={isQuote ? { color: "var(--lavender-ink)" } : undefined}>
            {heading}
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-(--surface-2) hover:text-(--text-1)"
            style={{ color: isQuote ? "var(--lavender-ink)" : "var(--text-3)" }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div
          className={`relative min-h-0 overflow-y-auto pb-6 pr-6 sm:pb-8 sm:pr-8 ${
            isQuote ? "pl-16 sm:pl-[4.5rem]" : "pl-6 sm:pl-8"
          }`}
        >
          {isQuote && (
            <span
              aria-hidden="true"
              className="t-page-title pointer-events-none absolute left-6 top-0 select-none leading-none sm:left-8"
              style={{ color: "var(--lavender-ink)", opacity: 0.4 }}
            >
              &ldquo;
            </span>
          )}
          <p className="t-body whitespace-pre-line break-words" style={{ color: "var(--text-1)" }}>
            {quote}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
