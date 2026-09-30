import { expect, test } from "vitest";
import { BRAND_COLORS, MARK, markDataUrl, markShapes, markSvg } from "./mark";

test("the mark is a note, a strip of tape and an N, in the brand colours", () => {
  const shapes = markShapes();
  expect(shapes).toContain(`<rect x="${MARK.note.x}"`);
  expect(shapes).toContain(`fill="${BRAND_COLORS.tape}"`);
  expect(shapes).toContain(MARK.glyph.d);
});

test("bare, it is cropped tight on a transparent ground", () => {
  const svg = markSvg({ size: 32 });
  expect(svg).toContain(`viewBox="${MARK.viewBox}"`);
  expect(svg).toContain('width="32" height="32"');
  expect(svg).not.toContain(BRAND_COLORS.page);
});

test("as an app icon, it sits scaled down on a page-coloured square", () => {
  const svg = markSvg({ background: BRAND_COLORS.page, scale: 0.6 });
  expect(svg).toContain(`fill="${BRAND_COLORS.page}"`);
  expect(svg).toContain("scale(0.6)");
  // No size of its own: the renderer sets one.
  expect(svg.slice(0, svg.indexOf(">"))).not.toContain("width=");
});

test("it can be used as an image source", () => {
  const url = markDataUrl({ size: 16 });
  expect(url.startsWith("data:image/svg+xml;utf8,")).toBe(true);
  expect(decodeURIComponent(url)).toContain('width="16"');
});
