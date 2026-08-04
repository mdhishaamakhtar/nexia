import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The unified back control (profile detail, edit, new, chat).
 * Pass a `label` for the pill form; omit it for the compact icon-only circle.
 * Both forms are 44px tall so they clear the touch-target floor.
 */
export default function BackButton({
  href,
  label,
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      prefetch
      aria-label={label ?? "Go back"}
      className={cn(
        // Symmetric px-3.5 keeps the hover pill balanced around its contents.
        //
        // Callers deliberately do NOT pull this left with a negative margin to
        // line the arrow glyph up with the card below it: that made the hover
        // fill spill past the card's left edge. The pill's own box is what the
        // eye tracks on hover, so the pill is what aligns to the column.
        //
        // The arrow also no longer slides on hover — nudging the icon inside a
        // pill that isn't moving read as the glyph drifting out of alignment.
        "group inline-flex h-11 items-center rounded-full border border-transparent text-sm font-semibold",
        "transition-colors duration-150 hover:border-(--border-mid) hover:bg-(--surface-2) active:scale-95",
        label ? "gap-2 px-3.5" : "w-11 justify-center",
        className
      )}
      style={{ color: "var(--text-2)" }}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label ? <span className="leading-none">{label}</span> : null}
    </Link>
  );
}
