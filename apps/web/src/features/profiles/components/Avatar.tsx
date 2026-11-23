import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { identityFor } from "../identity";
import { SHAPE_PARTS, type ShapePart } from "../shapes";

const SIZES = {
  sm: "h-11 w-11",
  md: "h-[4.25rem] w-[4.25rem]",
  lg: "h-24 w-24 sm:h-32 sm:w-32",
} as const;

function Part({ part }: { part: ShapePart }) {
  if (part.kind === "circle") return <circle cx={part.cx} cy={part.cy} r={part.r} />;
  if (part.kind === "rect") {
    return (
      <rect
        x={part.x}
        y={part.y}
        width={part.size}
        height={part.size}
        rx={part.rx}
        transform={part.rotate ? `rotate(${part.rotate} 50 50)` : undefined}
      />
    );
  }
  return (
    <path
      d={part.d}
      // The stroke rounds the corners; it is the same colour as the fill.
      stroke={part.strokeWidth ? "var(--p)" : undefined}
      strokeWidth={part.strokeWidth}
      strokeLinejoin={part.strokeWidth ? "round" : undefined}
    />
  );
}

/**
 * One of the seven shapes in one of the six colours, on its own. Which of each
 * comes from the id, as it does for a person (see identity.ts). `children` are
 * drawn over it on the same 100-unit grid.
 */
export function Shape({
  id,
  className,
  children,
}: {
  id: number;
  className?: string;
  children?: ReactNode;
}) {
  const identity = identityFor(id);
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      data-shape={identity.shape}
      className={cn("shrink-0", identity.className, className)}
    >
      <g fill="var(--p)">
        {SHAPE_PARTS[identity.shape].map((part, i) => (
          <Part key={i} part={part} />
        ))}
      </g>
      {children}
    </svg>
  );
}

/**
 * A person's initial inside their shape, in their colour (see identity.ts).
 * There are no photos in Nexia, so this is the face someone has everywhere.
 * Decorative: whatever it sits beside carries the name.
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
    <Shape id={id} className={cn(SIZES[size], className)}>
      <text
        x="50"
        y="66"
        textAnchor="middle"
        fontSize="46"
        fontWeight="700"
        fill="var(--p-ink)"
        className="select-none"
      >
        {name.trim().charAt(0).toUpperCase() || "?"}
      </text>
    </Shape>
  );
}
