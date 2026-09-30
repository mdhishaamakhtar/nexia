import { cn } from "@/lib/utils";

/**
 * Nexia's spark glyph — a clean, balanced four-point sparkle that reads as
 * "insight / a little bit of magic". Inherits `currentColor`, so it sits on any
 * surface. Used as the inner mark of {@link NexiaAvatar}.
 */
export function NexiaIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 1.6c0 0 1.25 7.05 2.5 8.3c1.25 1.25 8.3 2.5 8.3 2.5s-7.05 1.25-8.3 2.5c-1.25 1.25-2.5 8.3-2.5 8.3s-1.25-7.05-2.5-8.3c-1.25-1.25-8.3-2.5-8.3-2.5s7.05-1.25 8.3-2.5c1.25-1.25 2.5-8.3 2.5-8.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * The assistant's avatar — a flat "die-cut sticker" squircle holding the spark
 * glyph. A thin white keyline gives it the cut-out-sticker feel that matches the
 * scrapbook surface, with no inset shadow (kept deliberately flat). `tilt` adds a
 * touch of hand-placed personality.
 */
export function NexiaAvatar({
  size = 32,
  tilt = 0,
  className,
}: {
  size?: number;
  tilt?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center text-white",
        className
      )}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        background: "var(--nexia-mark)",
        // A white keyline that lifts the mark off cream and peach surfaces.
        // It was written as `box-shadow: 0 0 0 1.5px` — zero offset, zero blur,
        // pure spread — which is a ring wearing a shadow's syntax and reads as a
        // Flat Rule violation to anyone grepping for one. `outline` draws the
        // same pixels outside the box without touching layout. The element is
        // not focusable, so this never competes with the global focus ring.
        outline: "1.5px solid #ffffff",
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
      }}
    >
      <NexiaIcon size={Math.round(size * 0.5)} />
    </span>
  );
}
