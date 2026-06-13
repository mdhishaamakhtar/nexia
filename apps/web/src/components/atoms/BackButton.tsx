import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Unified back control used across the dashboard (profile detail, edit, new, chat).
 * Pass a `label` for the labelled pill form; omit it for the compact icon-only circle.
 */
export default function BackButton({
  href,
  label,
  className = "",
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  const shape = label ? "gap-2 pl-2.5 pr-3.5" : "w-9 justify-center";

  return (
    <Link
      href={href}
      prefetch
      aria-label={label ?? "Go back"}
      className={`group inline-flex h-9 items-center rounded-full border border-transparent text-sm font-semibold transition-colors hover:border-(--border) hover:bg-(--fill) active:scale-95 ${shape} ${className}`}
      style={{ color: "var(--text-3)" }}
    >
      <ArrowLeft
        className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
        aria-hidden="true"
      />
      {label ? <span>{label}</span> : null}
    </Link>
  );
}
