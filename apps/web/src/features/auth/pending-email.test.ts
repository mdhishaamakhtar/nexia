import { afterEach, describe, expect, test, vi } from "vitest";
import { pendingEmail, rememberPendingEmail, safeNext } from "./pending-email";

describe("the address awaiting confirmation", () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  test("is remembered for this tab", () => {
    expect(pendingEmail()).toBe("");
    rememberPendingEmail("asha@example.com");
    expect(pendingEmail()).toBe("asha@example.com");
  });

  test("is simply forgotten when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    expect(() => rememberPendingEmail("asha@example.com")).not.toThrow();
    expect(pendingEmail()).toBe("");
  });
});

describe("where to go after signing in", () => {
  test("follows a path on this site", () => {
    expect(safeNext("/profiles/12/edit?tab=1")).toBe("/profiles/12/edit?tab=1");
  });

  test("never leaves the site", () => {
    for (const next of ["https://evil.com", "//evil.com", "/\\evil.com", "evil.com", "", null]) {
      expect(safeNext(next), String(next)).toBe("/profiles");
    }
  });
});
