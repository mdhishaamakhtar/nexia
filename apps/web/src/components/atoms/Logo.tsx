import { cn } from "@/lib/utils";
import { BRAND_COLORS, MARK } from "@/shared/brand/mark";

/**
 * The Nexia mark on its own: the pinned "N" note. Decorative — whatever it
 * sits in (a link, a heading) carries the name. Inside a `group/logo` it tips
 * a few degrees further on hover, as if nudged.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  const { note, glyph, tape, tilt } = MARK;
  return (
    <svg
      viewBox={MARK.viewBox}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn(
        "shrink-0 transition-transform duration-200 ease-out group-hover/logo:-rotate-6 motion-reduce:transition-none",
        className
      )}
    >
      <g transform={tilt}>
        <rect
          x={note.x}
          y={note.y}
          width={note.width}
          height={note.height}
          rx={note.rx}
          fill={BRAND_COLORS.paper}
          stroke={BRAND_COLORS.ink}
          strokeWidth={note.strokeWidth}
        />
        <path transform={glyph.transform} d={glyph.d} fill={BRAND_COLORS.ink} />
      </g>
      <polygon points={tape.points} transform={tape.transform} fill={BRAND_COLORS.tape} />
    </svg>
  );
}

const SIZES = {
  sm: { mark: 22, text: "text-sm", gap: "gap-1.5" },
  md: { mark: 28, text: "text-base", gap: "gap-2" },
  lg: { mark: 40, text: "text-2xl", gap: "gap-2.5" },
} as const;

/** The mark with the wordmark set beside it in Nunito ExtraBold. */
export default function Logo({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <span
      className={cn(
        "inline-flex items-center font-extrabold tracking-tight text-text-1",
        s.gap,
        s.text,
        className
      )}
    >
      <LogoMark size={s.mark} />
      Nexia
    </span>
  );
}
