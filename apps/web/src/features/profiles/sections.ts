/**
 * The four sections a profile is kept in, and the tape each one is marked with.
 *
 * The colour belongs to the section, not to its position in a loop. Reading a
 * profile and editing one are the same document in two states, so "Favorites"
 * is peach-taped on the detail page, in the form, and in the PDF export — and
 * a reader who has scrolled the page once knows where they are in the form
 * before they read a word. Changing a colour here changes it everywhere,
 * which is the point; a modulo over the render order could not promise that.
 *
 * The order matches `sectionAccents` in `exportProfilePdf.ts`.
 */
export interface ProfileSectionDef {
  id: string;
  title: string;
  /** Tape colour. A surface tint — never used as a foreground. */
  tape: string;
}

export const PROFILE_SECTIONS = {
  overview: { id: "overview", title: "Overview", tape: "var(--lavender)" },
  interests: { id: "interests", title: "Favorites & interests", tape: "var(--peach)" },
  lifestyle: { id: "lifestyle", title: "Lifestyle", tape: "var(--blue)" },
  deep: { id: "deep", title: "Deep dive", tape: "var(--lavender)" },
} as const satisfies Record<string, ProfileSectionDef>;

/**
 * Rank tints for a top three.
 *
 * The one place three accents legitimately sit together: rank is the
 * information, so each place gets its own colour — and its own number, because
 * colour is never the only code. Mirrors the numbered badges in the export.
 */
export const RANK_TINTS = [
  { wash: "var(--lavender-soft)", line: "var(--lavender-line)", ink: "var(--lavender-ink)" },
  { wash: "var(--peach-soft)", line: "var(--peach-line)", ink: "var(--peach-ink)" },
  { wash: "var(--blue-soft)", line: "var(--blue-line)", ink: "var(--blue-ink-deep)" },
] as const;
