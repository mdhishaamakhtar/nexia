import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The unified back control. Pass a `label` for the pill; omit it for the
 * compact circle. Both are 44px tall. `onColor` is for a back control that
 * sits on someone's colour: translucent white, in their ink.
 */
export default function BackButton({
  href,
  label,
  onColor = false,
  collapse = false,
  className,
}: {
  href: string;
  label?: string;
  onColor?: boolean;
  /** Show only the arrow on a phone, where the label would crowd its row. */
  collapse?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label ? undefined : "Go back"}
      className={cn(
        "inline-flex h-11 items-center rounded-full text-[0.9375rem] font-semibold transition-colors duration-150",
        onColor
          ? "bg-white/70 text-current hover:bg-white"
          : "bg-surface-2 text-text-1 hover:bg-surface-3",
        !label && "w-11 justify-center",
        label && !collapse && "gap-2 pl-3.5 pr-4.5",
        label && collapse && "w-11 justify-center sm:w-auto sm:gap-2 sm:pl-3.5 sm:pr-4.5",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label ? (
        <span
          className={cn("whitespace-nowrap leading-none", collapse && "sr-only sm:not-sr-only")}
        >
          {label}
        </span>
      ) : null}
    </Link>
  );
}
