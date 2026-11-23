import { PERSON_COLORS, type PersonColor } from "@nexia/shared/brand";

/**
 * How a person looks: one of six colours and one of seven shapes behind their
 * initial. Both are keyed off the profile id, never the position in a list,
 * so someone is the same in the grid, on their own page and in a chat result
 * however the list is filtered or sorted.
 *
 * Six and seven share no factor, so the pair only repeats every 42 people,
 * and two people added one after the other never share a colour or a shape.
 */
export const PERSON_SHAPES = [
  "circle",
  "squircle",
  "clover",
  "flower",
  "arch",
  "diamond",
  "hexagon",
] as const;
export type PersonShape = (typeof PERSON_SHAPES)[number];

export interface PersonIdentity {
  color: PersonColor;
  shape: PersonShape;
  /**
   * Put this on an element to give everything inside it the person's colour:
   * it sets `--p`, `--p-soft`, `--p-tint` and `--p-ink` (see globals.css).
   */
  className: `person-${PersonColor}`;
}

export function identityFor(id: number): PersonIdentity {
  // Anything that is not a real id gets the first of each, never nothing.
  const n = Number.isFinite(id) ? Math.abs(Math.trunc(id)) : 0;
  const color = PERSON_COLORS[n % PERSON_COLORS.length]!;
  return {
    color,
    shape: PERSON_SHAPES[n % PERSON_SHAPES.length]!,
    className: `person-${color}`,
  };
}
