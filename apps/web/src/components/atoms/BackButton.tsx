import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The unified back control. Pass a `label` for the pill; omit it for the
 * compact circle. Both are 44px tall. The pill's own box aligns to the column,
 * so its hover fill never spills past the card below.
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
      aria-label={label ? undefined : "Go back"}
      className={cn(
        "inline-flex h-11 items-center rounded-full border border-transparent text-sm font-semibold text-text-2",
        "transition-colors duration-150 hover:border-line-mid hover:bg-surface-2 hover:text-text-1",
        label ? "gap-2 px-3.5" : "w-11 justify-center",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label ? <span className="leading-none">{label}</span> : null}
    </Link>
  );
}
