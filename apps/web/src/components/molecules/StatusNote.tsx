import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * What a screen shows in place of its content: not found, can't load, nothing
 * here yet. A neutral panel with a title, a line of help and the way out. Three
 * small shapes sit above the title so an empty state still looks like Nexia
 * rather than an error page.
 */
export default function StatusNote({
  title,
  children,
  actions,
  headingLevel = "h2",
  className,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  headingLevel?: "h1" | "h2";
  className?: string;
}) {
  const Heading = headingLevel;
  return (
    <div
      className={cn(
        "panel mx-auto max-w-lg rounded-[2rem] px-7 py-10 text-center sm:px-10 sm:py-12",
        className
      )}
    >
      <svg
        viewBox="0 0 132 48"
        aria-hidden="true"
        focusable="false"
        className="mx-auto mb-6 h-12 w-[8.25rem]"
      >
        <circle cx="24" cy="24" r="22" fill="var(--sky)" />
        <rect x="46" y="4" width="40" height="40" rx="14" fill="var(--butter)" />
        <g fill="var(--pink)">
          <circle cx="98" cy="14" r="12" />
          <circle cx="118" cy="14" r="12" />
          <circle cx="98" cy="34" r="12" />
          <circle cx="118" cy="34" r="12" />
        </g>
      </svg>
      <Heading className="t-section-title text-balance text-text-1">{title}</Heading>
      {children && (
        <div className="t-body mx-auto mt-2.5 max-w-sm text-pretty text-text-2">{children}</div>
      )}
      {actions && (
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">{actions}</div>
      )}
    </div>
  );
}
