import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type TapeColor = "peach" | "lavender" | "blue";

/**
 * A strip of washi tape pinned across the top edge of a surface. Decoration
 * only (hidden from assistive tech). One per surface; its colour is chosen by
 * what the surface is, never by its position in a list.
 */
export default function Tape({
  color = "lavender",
  width = 60,
  height = 20,
  tilt = -2,
  className,
  style,
}: {
  color?: TapeColor;
  width?: number;
  height?: number;
  tilt?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("washi-tape", className)}
      style={{
        width,
        height,
        background: `var(--${color})`,
        transform: `translateX(-50%) rotate(${tilt}deg)`,
        ...style,
      }}
    />
  );
}
