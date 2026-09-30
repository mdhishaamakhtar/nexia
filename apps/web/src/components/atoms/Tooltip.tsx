import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A label for an icon-only control, shown on hover and on keyboard focus, drawn
 * as a small paper tag rather than the browser's native tooltip. The control
 * must already carry an `aria-label`; this is for sighted pointer and keyboard
 * users, so it is hidden from assistive tech.
 */
export default function Tooltip({
  label,
  side = "bottom",
  children,
  className,
}: {
  label: string;
  side?: "top" | "bottom";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group/tip relative inline-flex", className)}>
      {children}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line-mid bg-surface px-2.5 py-1 text-xs font-semibold text-text-1 opacity-0 transition-opacity duration-150",
          "group-hover/tip:opacity-100 group-has-[:focus-visible]/tip:opacity-100",
          side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5"
        )}
      >
        {label}
      </span>
    </span>
  );
}
