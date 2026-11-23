import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { BRAND, PERSON_COLORS, PERSON_PALETTE } from "@nexia/shared/brand";

/**
 * The palette is written twice: as CSS variables for the browser, and as data
 * in `@nexia/shared/brand` for the logo, the PDF, the social image and the
 * emails, none of which can read a stylesheet. These tests are what make the
 * two one palette.
 */
const css = readFileSync(join(import.meta.dirname, "../../app/globals.css"), "utf8");

/** The value a variable is given in `:root`. */
function token(name: string): string | undefined {
  return new RegExp(`^\\s*--${name}:\\s*([^;]+);`, "m").exec(css)?.[1]?.trim();
}

test.each(PERSON_COLORS)("%s is the same four steps in the stylesheet and in the data", (color) => {
  const swatch = PERSON_PALETTE[color];
  expect(token(color)).toBe(swatch.base);
  expect(token(`${color}-soft`)).toBe(swatch.soft);
  expect(token(`${color}-tint`)).toBe(swatch.tint);
  expect(token(`${color}-ink`)).toBe(swatch.ink);
});

test("every person colour has a class that makes it the current person", () => {
  for (const color of PERSON_COLORS) {
    expect(css).toContain(`.person-${color} {`);
    expect(css).toContain(`--p: var(--${color});`);
  }
});

test("the neutrals and the action colour match too", () => {
  expect(token("page")).toBe(BRAND.page);
  expect(token("surface-2")).toBe(BRAND.panel);
  expect(token("border")).toBe(BRAND.line);
  expect(token("border-mid")).toBe(BRAND.lineMid);
  expect(token("text-1")).toBe(BRAND.ink);
  expect(token("text-2")).toBe(BRAND.ink2);
  expect(token("text-3")).toBe(BRAND.ink3);
  expect(token("action")).toBe(BRAND.action);
  expect(token("action-ink")).toBe(BRAND.actionInk);
});
