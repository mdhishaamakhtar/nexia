import { cn } from "@/lib/utils";

/**
 * The single horizontal-alignment primitive for the whole app.
 *
 * - `wide`    (72rem) — browse grids, landing page, navbar
 * - `reading` (48rem) — profile detail, forms, chat
 *
 * The widths live in globals.css (`--shell-wide` / `--shell-reading`) and the
 * gutters are one responsive `--gutter` token, so the two are always concentric.
 */
export default function PageShell({
  width = "wide",
  className,
  children,
  as: Tag = "div",
  id,
}: {
  width?: "wide" | "reading";
  className?: string;
  children: React.ReactNode;
  as?: "div" | "main" | "section" | "header" | "footer" | "nav";
  id?: string;
}) {
  return (
    <Tag id={id} className={cn("shell", `shell-${width}`, className)}>
      {children}
    </Tag>
  );
}
