import { expect, test } from "vitest";
import { BRAND_COLORS, MARK, markDataUrl, markShapes, markSvg } from "./mark";

test("the mark is four petals around a yellow centre, in the brand colours", () => {
  const shapes = markShapes();
  for (const petal of MARK.petals) {
    expect(shapes).toContain(`<circle cx="${petal.cx}" cy="${petal.cy}" r="${MARK.radius}"`);
    expect(shapes).toContain(`fill="${petal.fill}"`);
  }
  expect(new Set(MARK.petals.map((p) => p.fill)).size).toBe(4);
  expect(shapes).toContain(`r="${MARK.centre.r}" fill="${BRAND_COLORS.butter}"`);
});

test("the first petal is tucked back over the last, so the turn never breaks", () => {
  const shapes = markShapes();
  const lastPetal = shapes.lastIndexOf(`fill="${MARK.petals.at(-1)!.fill}"`);
  const tuck = shapes.indexOf(MARK.tuck.d);
  expect(MARK.tuck.fill).toBe(MARK.petals[0].fill);
  expect(tuck).toBeGreaterThan(lastPetal);
  // The centre is painted last, over every overlap.
  expect(shapes.indexOf(`r="${MARK.centre.r}"`)).toBeGreaterThan(tuck);
});

test("bare, it is cropped tight on a transparent ground", () => {
  const svg = markSvg({ size: 32 });
  expect(svg).toContain(`viewBox="${MARK.viewBox}"`);
  expect(svg).toContain('width="32" height="32"');
  expect(svg).not.toContain("<rect");
});

test("as an app icon, it sits scaled down on a full square of one colour", () => {
  const svg = markSvg({ background: BRAND_COLORS.ink, scale: 0.6 });
  expect(svg).toContain(`<rect x="4" y="4" width="92" height="92" fill="${BRAND_COLORS.ink}"/>`);
  expect(svg).toContain("scale(0.6)");
  // No size of its own: the renderer sets one.
  expect(svg.slice(0, svg.indexOf(">"))).not.toContain("width=");
});

test("it can be used as an image source", () => {
  const url = markDataUrl({ size: 16 });
  expect(url.startsWith("data:image/svg+xml;utf8,")).toBe(true);
  expect(decodeURIComponent(url)).toContain('width="16"');
});
