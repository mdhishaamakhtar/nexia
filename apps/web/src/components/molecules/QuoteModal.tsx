"use client";

import { useId } from "react";
import Dialog from "@/components/overlays/Dialog";
import { cn } from "@/lib/utils";

/**
 * The full text of a quote or a memory, pinned up on its own. The words are
 * the point, so they are set large and everything else steps back to a label.
 *
 * A quote keeps the lavender wash and the hanging mark and is signed with the
 * person's name — these are their words. A memory stays on the plain well with
 * no mark and says who it is shared with — it is yours.
 */
export default function QuoteModal({
  text,
  person,
  onClose,
  variant = "quote",
}: {
  /** Null keeps the dialog closed, so its exit can play. */
  text: string | null;
  person: string;
  onClose: () => void;
  variant?: "quote" | "memory";
}) {
  const titleId = useId();
  const isQuote = variant === "quote";
  // Long passages drop a size so they still read as prose, not a poster.
  const long = (text?.length ?? 0) > 220;

  return (
    <Dialog
      open={text !== null}
      onClose={onClose}
      eyebrow={isQuote ? "In their words" : `A memory with ${person}`}
      titleId={titleId}
      tape={isQuote ? "lavender" : "peach"}
      tone={isQuote ? "lavender" : "sunk"}
      showClose
      className="max-w-xl"
    >
      <h2 id={titleId} className="sr-only">
        {isQuote ? `${person}, in their words` : `A memory with ${person}`}
      </h2>
      <figure className={cn("relative", isQuote && "pl-10 sm:pl-12")}>
        {isQuote && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-1 -top-3 select-none text-[4.5rem] font-extrabold leading-none text-lavender-ink/30"
          >
            &ldquo;
          </span>
        )}
        <blockquote>
          <p
            className={cn(
              "whitespace-pre-line break-words text-pretty font-semibold tracking-tight text-text-1",
              long ? "text-lg leading-relaxed" : "text-xl leading-snug sm:text-2xl"
            )}
          >
            {text}
          </p>
        </blockquote>
        {isQuote && (
          <figcaption className="mt-5 flex items-center gap-2.5 text-sm font-bold text-lavender-ink">
            <span aria-hidden="true" className="h-0.5 w-6 rounded-full bg-lavender-ink/40" />
            {person}
          </figcaption>
        )}
      </figure>
    </Dialog>
  );
}
