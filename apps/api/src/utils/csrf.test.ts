import { describe, test, expect } from "bun:test";
import { generateCsrfToken } from "../utils/csrf";

describe("csrf", () => {
  test("generates 64-char hex token", () => {
    const token = generateCsrfToken();
    expect(token.length).toBe(64);
    expect(token).not.toContain(" ");
  });

  test("generates unique tokens", () => {
    const t1 = generateCsrfToken();
    const t2 = generateCsrfToken();
    expect(t1).not.toBe(t2);
  });
});
