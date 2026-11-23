"use client";

import { useId } from "react";
import Dialog from "@/components/overlays/Dialog";
import { cn } from "@/lib/utils";

/**
 * The full text of a quote or a memory, on a sheet of its own. The words are
 * the point, so they are set large and everything else steps back.
 *
 * A quote is theirs: the sheet takes the person's colour and is signed with
 * their name. A memory is yours: it stays on white and says who it is with.
 */
export default function QuoteModal({
  text,
  person,
  personClassName,
  onClose,
  variant = "quote",
}: {
  /** Null keeps the dialog closed, so its exit can play. */
  text: string | null;
  person: string;
  /** The `person-*` class of whoever said it, so a quote takes their colour. */
  personClassName?: string;
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
      title={isQuote ? undefined : `A memory with ${person}`}
      titleId={titleId}
      tone={isQuote ? "person" : "plain"}
      showClose
      className={cn("max-w-xl", isQuote && personClassName)}
    >
      {isQuote && (
        <h2 id={titleId} className="sr-only">
          {person}, in their words
        </h2>
      )}
      <figure>
        <blockquote>
          <p
            className={cn(
              "whitespace-pre-line break-words text-pretty",
              isQuote
                ? cn(
                    "font-bold tracking-[-0.02em]",
                    long ? "text-xl leading-snug" : "text-2xl leading-[1.2] sm:text-[2rem]"
                  )
                : "text-[1.0625rem] leading-relaxed sm:text-lg"
            )}
          >
            {text}
          </p>
        </blockquote>
        {isQuote && <figcaption className="mt-5 text-base font-semibold">{person}</figcaption>}
      </figure>
    </Dialog>
  );
}
