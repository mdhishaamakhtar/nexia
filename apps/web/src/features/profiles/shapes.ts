import type { PersonShape } from "./identity";

/**
 * The seven shapes a person can have, as data on a 100-unit grid that each
 * fills edge to edge. The avatar draws them as React elements; the profile PDF
 * needs them as an SVG string. Both read this list, so a shape cannot look one
 * way on screen and another on paper.
 */
export type ShapePart =
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "rect"; x: number; y: number; size: number; rx: number; rotate?: number }
  /** `strokeWidth` rounds the corners: the stroke is the fill's own colour. */
  | { kind: "path"; d: string; strokeWidth?: number };

const circle = (cx: number, cy: number, r: number): ShapePart => ({ kind: "circle", cx, cy, r });

export const SHAPE_PARTS: Record<PersonShape, readonly ShapePart[]> = {
  circle: [circle(50, 50, 48)],
  squircle: [{ kind: "rect", x: 3, y: 3, size: 94, rx: 32 }],
  clover: [circle(31, 31, 29), circle(69, 31, 29), circle(31, 69, 29), circle(69, 69, 29)],
  flower: [
    circle(83, 50, 16),
    circle(73.3, 73.3, 16),
    circle(50, 83, 16),
    circle(26.7, 73.3, 16),
    circle(17, 50, 16),
    circle(26.7, 26.7, 16),
    circle(50, 17, 16),
    circle(73.3, 26.7, 16),
    circle(50, 50, 36),
  ],
  arch: [
    { kind: "path", d: "M3 85V48a47 47 0 0 1 94 0v37a12 12 0 0 1-12 12H15A12 12 0 0 1 3 85z" },
  ],
  diamond: [{ kind: "rect", x: 15, y: 15, size: 70, rx: 18, rotate: 45 }],
  hexagon: [{ kind: "path", d: "M50 9l36 20.5v41L50 91 14 70.5v-41z", strokeWidth: 10 }],
};

/** A shape as a standalone SVG document in one colour, for an image source. */
export function shapeSvg(shape: PersonShape, fill: string, size?: number): string {
  const parts = SHAPE_PARTS[shape].map((part) => {
    if (part.kind === "circle") return `<circle cx="${part.cx}" cy="${part.cy}" r="${part.r}"/>`;
    if (part.kind === "rect") {
      const turn = part.rotate ? ` transform="rotate(${part.rotate} 50 50)"` : "";
      return `<rect x="${part.x}" y="${part.y}" width="${part.size}" height="${part.size}" rx="${part.rx}"${turn}/>`;
    }
    const edge = part.strokeWidth
      ? ` stroke="${fill}" stroke-width="${part.strokeWidth}" stroke-linejoin="round"`
      : "";
    return `<path d="${part.d}"${edge}/>`;
  });
  const dims = size ? ` width="${size}" height="${size}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${dims}><g fill="${fill}">${parts.join("")}</g></svg>`;
}
