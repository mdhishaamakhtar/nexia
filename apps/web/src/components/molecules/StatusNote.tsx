import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Tape, { type TapeColor } from "@/components/atoms/Tape";

/**
 * A pinned note on the page itself, for the states a screen can land in
 * instead of its content: not found, can't load, nothing here yet. It is the
 * in-page twin of the Dialog — same tape, eyebrow, title and actions — so an
 * empty or broken state still looks like part of the scrapbook.
 */
export default function StatusNote({
  eyebrow,
  title,
  children,
  actions,
  tape = "lavender",
  headingLevel = "h2",
  className,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  tape?: TapeColor;
  headingLevel?: "h1" | "h2";
  className?: string;
}) {
  const Heading = headingLevel;
  return (
    <div
      className={cn(
        "paper relative mx-auto max-w-md rounded-3xl px-7 pb-7 pt-9 text-center sm:px-9",
        className
      )}
    >
      <Tape color={tape} width={92} height={22} tilt={-2.5} />
      {eyebrow && <p className="t-label mb-2">{eyebrow}</p>}
      <Heading className="t-section-title text-balance text-text-1">{title}</Heading>
      {children && (
        <div className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-text-2">{children}</div>
      )}
      {actions && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{actions}</div>
      )}
    </div>
  );
}
