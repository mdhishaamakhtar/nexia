/**
 * The Nexia mark: four people, one flower. Four round petals, each in one of
 * the colours a person can be, overlapping in turn around a yellow centre
 * where they meet (DESIGN.md, "The mark").
 *
 * This module is the one source of the mark's geometry. The React logo, the
 * social preview image and the static icons all draw from it, so the icons in
 * `src/app` and `public/icons`, and the files in `docs/brand`, are renders of
 * this module. Change it, then re-render them with `npm run brand -w web`.
 *
 * Plain data and string building only: it is imported by the browser bundle,
 * the Open Graph route and a Node script alike.
 */

import { BRAND, PERSON_PALETTE } from "@nexia/shared/brand";

/** The colours the mark and its lockups are drawn in. */
export const BRAND_COLORS = {
  page: BRAND.page,
  ink: BRAND.ink,
  inkMuted: BRAND.ink3,
  peach: PERSON_PALETTE.peach.base,
  pink: PERSON_PALETTE.pink.base,
  lilac: PERSON_PALETTE.lilac.base,
  sky: PERSON_PALETTE.sky.base,
  butter: PERSON_PALETTE.butter.base,
} as const;

/**
 * Drawn on a 100-unit grid and cropped to the petals, so the mark fills
 * whatever box it is given.
 *
 * The petals are painted clockwise from the top left, each over the one
 * before. That leaves the last (sky) on top of the first (peach), which would
 * break the turn, so `tuck` repaints the sliver where those two overlap in
 * peach: every petal then sits over one neighbour and under the other.
 */
export const MARK = {
  viewBox: "4 4 92 92",
  radius: 28,
  petals: [
    { cx: 33, cy: 33, fill: BRAND_COLORS.peach },
    { cx: 67, cy: 33, fill: BRAND_COLORS.pink },
    { cx: 67, cy: 67, fill: BRAND_COLORS.lilac },
    { cx: 33, cy: 67, fill: BRAND_COLORS.sky },
  ],
  tuck: { d: "M10.751 50A28 28 0 0 1 55.249 50A28 28 0 0 1 10.751 50Z", fill: BRAND_COLORS.peach },
  centre: { cx: 50, cy: 50, r: 15, fill: BRAND_COLORS.butter },
} as const;

/** The mark's shapes as SVG markup, in the 100-unit grid. */
export function markShapes(): string {
  const { petals, radius, tuck, centre } = MARK;
  return [
    ...petals.map((p) => `<circle cx="${p.cx}" cy="${p.cy}" r="${radius}" fill="${p.fill}"/>`),
    `<path d="${tuck.d}" fill="${tuck.fill}"/>`,
    `<circle cx="${centre.cx}" cy="${centre.cy}" r="${centre.r}" fill="${centre.fill}"/>`,
  ].join("");
}

/**
 * The mark as a standalone SVG document.
 *
 * With `background`, it sits on a full-bleed square of that colour at
 * `scale` of the width: the form app icons need, since iOS and Android put
 * their own mask over an opaque square. Without, it is the bare mark on
 * transparency, cropped tight, for favicons and inline use.
 */
export function markSvg({
  size,
  background,
  scale = 1,
}: { size?: number; background?: string; scale?: number } = {}): string {
  const dims = size ? ` width="${size}" height="${size}"` : "";
  if (!background) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK.viewBox}"${dims}>${markShapes()}</svg>`;
  }
  // Scale about the centre of the cropped viewBox (50, 50).
  const inset = `translate(50 50) scale(${scale}) translate(-50 -50)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK.viewBox}"${dims}><rect x="4" y="4" width="92" height="92" fill="${background}"/><g transform="${inset}">${markShapes()}</g></svg>`;
}

/** The mark as a `data:` URL, for places that take an image source. */
export function markDataUrl(options?: Parameters<typeof markSvg>[0]): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(markSvg(options))}`;
}
