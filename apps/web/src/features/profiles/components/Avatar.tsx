import { cn } from "@/lib/utils";
import { tiltFor } from "../identity";

const SIZES = {
  sm: "h-10 w-10 rounded-lg text-sm",
  md: "h-11 w-11 rounded-xl text-sm",
  lg: "h-20 w-20 rounded-2xl text-4xl sm:h-24 sm:w-24",
} as const;

/**
 * A person's initial on a lavender tile — lavender everywhere, because an
 * avatar is "keepsake lavender" in DESIGN.md, not whatever colour its slot in
 * a loop happened to get. The tilt is the person's own (see identity.ts).
 */
export default function Avatar({
  id,
  name,
  size = "md",
  className,
}: {
  id: number;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center bg-lavender font-extrabold text-lavender-ink",
        SIZES[size],
        className
      )}
      style={{ transform: `rotate(${tiltFor(id)}deg)` }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
