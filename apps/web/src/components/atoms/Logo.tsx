import { cn } from "@/lib/utils";
import { MARK } from "@/shared/brand/mark";

/**
 * The Nexia mark on its own: four petals around a yellow centre. Decorative —
 * whatever it sits in (a link, a heading) carries the name. Inside a
 * `group/logo` it turns an eighth of the way round on hover, like a pinwheel.
 */
export function LogoMark({ size = 30, className }: { size?: number; className?: string }) {
  const { petals, radius, tuck, centre } = MARK;
  return (
    <svg
      viewBox={MARK.viewBox}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn(
        "shrink-0 transition-transform duration-500 ease-out group-hover/logo:rotate-45 motion-reduce:transition-none",
        className
      )}
    >
      {petals.map((petal) => (
        <circle key={petal.fill} cx={petal.cx} cy={petal.cy} r={radius} fill={petal.fill} />
      ))}
      <path d={tuck.d} fill={tuck.fill} />
      <circle cx={centre.cx} cy={centre.cy} r={centre.r} fill={centre.fill} />
    </svg>
  );
}

const SIZES = {
  sm: { mark: 24, text: "text-lg", gap: "gap-2" },
  md: { mark: 30, text: "text-[1.3125rem]", gap: "gap-2.5" },
  lg: { mark: 48, text: "text-4xl", gap: "gap-3.5" },
} as const;

/** The mark with the wordmark set beside it in Alan Sans Bold. */
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
        "inline-flex items-center font-bold leading-none tracking-[-0.02em] text-text-1",
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
