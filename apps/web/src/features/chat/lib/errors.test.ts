import { afterEach, expect, test, vi } from "vitest";
import { describeChatError } from "./errors";

const apiError = (code: string) => new Error(JSON.stringify({ error: { code, message: "x" } }));

afterEach(() => vi.restoreAllMocks());

test.each([
  ["RATE_LIMITED", /a few seconds/, true],
  ["AI_UNAVAILABLE", /isn't set up/, false],
  ["PAYLOAD_TOO_LARGE", /grown too long/, false],
  ["VALIDATION_ERROR", /couldn't be read/, false],
])("%s says what to do next", (code, message, retry) => {
  const problem = describeChatError(apiError(code));
  expect(problem.message).toMatch(message);
  expect(problem.retry).toBe(retry);
});

test("a broken stream or network failure can be retried", () => {
  expect(describeChatError(new Error("socket hang up"))).toEqual({
    message: "The reply didn't come through. Try again.",
    retry: true,
  });
  expect(describeChatError(undefined).retry).toBe(true);
});

test("being offline is named as such", () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  expect(describeChatError(new Error("fetch failed")).message).toMatch(/offline/);
});
