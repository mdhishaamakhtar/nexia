/**
 * The Nexia mark: a note pinned to the page. A white card with a strip of
 * peach washi tape across its top edge and an "N" on it, set down a little
 * crooked, like every card in the app (DESIGN.md, "Pinned notes").
 *
 * This module is the one source of the mark's geometry. The React logo, the
 * social preview image and the static icons all draw from it, so the icons in
 * `src/app` and `public/icons`, and the files in `docs/brand`, are renders of
 * this module. Change it, then re-render them with `npm run brand -w web`.
 *
 * Plain data and string building only: it is imported by the browser bundle,
 * the Open Graph route and a Node script alike.
 */

export const BRAND_COLORS = {
  page: "#fff7ed",
  paper: "#ffffff",
  ink: "#292524",
  inkMuted: "#6f6660",
  tape: "#fdba74",
} as const;

/**
 * Nunito ExtraBold "N", outlined at 100px with its baseline at y = 0, so the
 * mark never depends on a font being loaded (a favicon cannot load one).
 */
const N_PATH =
  "M14.3 0.9Q10.8 0.9 8.95 -1.05Q7.1 -3 7.1 -6.6V-63.6Q7.1 -67.4 8.95 -69.4Q10.8 -71.4 13.9 -71.4Q16.6 -71.4 18.05 -70.35Q19.5 -69.3 21.4 -66.9L56.5 -22.2H53.8V-64Q53.8 -67.5 55.65 -69.45Q57.5 -71.4 61 -71.4Q64.5 -71.4 66.35 -69.45Q68.2 -67.5 68.2 -64V-6.3Q68.2 -3 66.5 -1.05Q64.8 0.9 61.9 0.9Q59.1 0.9 57.45 -0.2Q55.8 -1.3 53.9 -3.7L18.9 -48.4H21.5V-6.6Q21.5 -3 19.7 -1.05Q17.9 0.9 14.3 0.9Z";

/**
 * Drawn on a 64-unit grid. The viewBox is cropped to the ink, centred on the
 * tilted note and its tape, so the mark fills whatever box it is given.
 */
export const MARK = {
  viewBox: "3.5 5 57 57",
  /** The note is set down 5° anticlockwise; the tape crosses it the other way. */
  tilt: "rotate(-5 32 35)",
  note: { x: 9, y: 11, width: 46, height: 48, rx: 12, strokeWidth: 3.25 },
  glyph: { d: N_PATH, transform: "translate(19.5 48.2) scale(0.332)" },
  /** The app's washi strip, notched at both ends like `.washi-tape`. */
  tape: {
    points: "20.82,6.5 43.18,6.5 45,11.5 43.18,16.5 20.82,16.5 19,11.5",
    transform: "rotate(4 32 11.5)",
  },
} as const;

/** The mark's shapes as SVG markup, in the 64-unit grid. */
export function markShapes(): string {
  const { note, glyph, tape, tilt } = MARK;
  return [
    `<g transform="${tilt}">`,
    `<rect x="${note.x}" y="${note.y}" width="${note.width}" height="${note.height}" rx="${note.rx}" fill="${BRAND_COLORS.paper}" stroke="${BRAND_COLORS.ink}" stroke-width="${note.strokeWidth}"/>`,
    `<path transform="${glyph.transform}" d="${glyph.d}" fill="${BRAND_COLORS.ink}"/>`,
    `</g>`,
    `<polygon points="${tape.points}" transform="${tape.transform}" fill="${BRAND_COLORS.tape}"/>`,
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
  // Scale about the centre of the cropped viewBox (32, 33.5).
  const inset = `translate(32 33.5) scale(${scale}) translate(-32 -33.5)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK.viewBox}"${dims}><rect x="3.5" y="5" width="57" height="57" fill="${background}"/><g transform="${inset}">${markShapes()}</g></svg>`;
}

/** The mark as a `data:` URL, for places that take an image source. */
export function markDataUrl(options?: Parameters<typeof markSvg>[0]): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(markSvg(options))}`;
}
