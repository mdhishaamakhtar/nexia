/**
 * Nexia's colours as data, for everything that cannot read a CSS variable: the
 * logo and the icons rendered from it, the profile PDF, the social preview
 * image, and the transactional emails the API sends.
 *
 * The browser gets the same values from `apps/web/src/app/globals.css`, which
 * stays the place a designer edits. A test in the web app
 * (`shared/brand/palette.test.ts`) fails if the two ever differ, so there is one
 * palette even though it is written in two languages.
 *
 * This file imports nothing, on purpose: it is reached through its own entry
 * point, `@nexia/shared/brand`, and a plain Node script can load it directly.
 */

/** The colours a person can be, in the order ids are dealt them. */
export const PERSON_COLORS = ["peach", "butter", "mint", "sky", "lilac", "pink"] as const;
export type PersonColor = (typeof PERSON_COLORS)[number];

/** One person colour in its four steps. Only `ink` is ever used for text. */
export interface PersonSwatch {
  /** The colour itself: the shape behind an initial, solid blocks. */
  base: string;
  /** A person's card and the top of their page. */
  soft: string;
  /** Panels on their page and in their form. */
  tint: string;
  /** Text and icons on any of the other three. */
  ink: string;
}

export const PERSON_PALETTE: Record<PersonColor, PersonSwatch> = {
  peach: { base: "#ff8f57", soft: "#ffd2b8", tint: "#fff0e6", ink: "#4f1d05" },
  butter: { base: "#ffc21a", soft: "#ffe894", tint: "#fff7d6", ink: "#453000" },
  mint: { base: "#4fcb8a", soft: "#bdebd0", tint: "#e6f7ed", ink: "#0b3d26" },
  sky: { base: "#5fa8ff", soft: "#c4deff", tint: "#e8f2ff", ink: "#082f57" },
  lilac: { base: "#a58cf5", soft: "#dacfff", tint: "#f1ecff", ink: "#22104f" },
  pink: { base: "#ff7fae", soft: "#ffcbdf", tint: "#ffe9f1", ink: "#5c0e31" },
};

/** Everything that is not a person's colour. */
export const BRAND = {
  page: "#ffffff",
  /** Neutral panels and chips. */
  panel: "#f5f4f8",
  line: "#e6e4ee",
  lineMid: "#cfccdb",
  ink: "#1c1a24",
  ink2: "#4a4757",
  ink3: "#5f5c6d",
  /** Tangerine: the one colour that means "do this", and its text colour. */
  action: "#ff8f57",
  actionInk: "#3a1503",
} as const;
