import type { TapeColor } from "@/components/atoms/Tape";

/**
 * A person's scrapbook identity: the strip of tape their card is pinned with,
 * and the tilt of their avatar. Both are keyed off the profile id, never the
 * position in a list, so someone looks the same in the grid, on their sheet,
 * and in a chat result however the list is filtered or sorted.
 */
const TAPES: ReadonlyArray<{ color: TapeColor; angle: number; width: number }> = [
  { color: "peach", angle: -2.5, width: 42 },
  { color: "lavender", angle: 1.8, width: 38 },
  { color: "blue", angle: -1.2, width: 46 },
  { color: "lavender", angle: 3, width: 34 },
  { color: "peach", angle: -3.4, width: 36 },
];

const TILTS = [-3, 2, -2, 3, -1] as const;

export function tapeFor(id: number) {
  return TAPES[Math.abs(id) % TAPES.length]!;
}

export function tiltFor(id: number): number {
  return TILTS[Math.abs(id) % TILTS.length]!;
}
