/**
 * The single horizontal-alignment primitive for the whole app.
 *
 * Every page and every full-width bar renders its content through this, so
 * the navbar, the profile grid, and the landing page all share one gutter
 * scale and line up exactly. Before this existed there were four container
 * widths and three padding scales, which is why the navbar never agreed
 * with the content underneath it.
 *
 * - `wide`    (72rem) — browse grids, landing page, navbar
 * - `reading` (48rem) — profile detail, forms, chat
 *
 * The widths live in globals.css (`--shell-wide` / `--shell-reading`) and the
 * gutters are a single responsive `--gutter` token, so the two variants are
 * always concentric.
 */
export default function PageShell({
  width = "wide",
  className = "",
  children,
  as: Tag = "div",
}: {
  width?: "wide" | "reading";
  className?: string;
  children: React.ReactNode;
  as?: "div" | "main" | "section" | "header" | "footer" | "nav";
}) {
  return <Tag className={`shell shell-${width} ${className}`.trim()}>{children}</Tag>;
}
