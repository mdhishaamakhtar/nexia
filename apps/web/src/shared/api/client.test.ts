import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, test, vi } from "vitest";
import { API as BASE, mockApi } from "@test/server";
import { api, getErrorMessage, loginRedirectFor, readApiError, redirectToLogin } from "./client";
import { CSRF_COOKIE_NAME, csrfHeaders, readCookie } from "./cookies";

const server = mockApi();

afterEach(() => vi.restoreAllMocks());

function failWith(status: number, body?: unknown) {
  server.use(
    http.get(`${BASE}/thing`, () =>
      body === undefined
        ? new HttpResponse("oops", { status })
        : HttpResponse.json(body, { status })
    )
  );
  return api
    .get("thing")
    .json()
    .catch((err: unknown) => err);
}

describe("cookies", () => {
  test("reads one cookie by name, decoded", () => {
    document.cookie = `${CSRF_COOKIE_NAME}=a%2Fb`;
    document.cookie = "other=1";
    expect(readCookie(CSRF_COOKIE_NAME)).toBe("a/b");
    expect(readCookie("missing")).toBeNull();
  });

  test("the CSRF header is only there when the cookie is", () => {
    expect(csrfHeaders()).toEqual({});
    document.cookie = `${CSRF_COOKIE_NAME}=tok`;
    expect(csrfHeaders()).toEqual({ "X-CSRF-Token": "tok" });
  });
});

describe("requests", () => {
  test("writes carry the CSRF token and reads don't", async () => {
    document.cookie = `${CSRF_COOKIE_NAME}=tok`;
    const seen: Array<string | null> = [];
    server.use(
      http.all(`${BASE}/thing`, ({ request }) => {
        seen.push(request.headers.get("X-CSRF-Token"));
        return HttpResponse.json({});
      })
    );
    await api.get("thing");
    await api.post("thing", { json: {} });
    await api.delete("thing");
    expect(seen).toEqual([null, "tok", "tok"]);
  });

  test("an auth endpoint's 401 is left to the page to answer", async () => {
    server.use(http.post(`${BASE}/auth/login`, () => new HttpResponse(null, { status: 401 })));
    const error = await api.post("auth/login").catch((err: unknown) => err);
    expect((await readApiError(error))?.status).toBe(401);
  });
});

describe("errors", () => {
  test("the API's envelope is read back", async () => {
    const error = await failWith(404, {
      error: { code: "NOT_FOUND", message: "Resource not found" },
    });
    expect(await readApiError(error)).toEqual({
      status: 404,
      code: "NOT_FOUND",
      message: "Resource not found",
    });
  });

  test("a body that isn't the envelope still has a status", async () => {
    expect(await readApiError(await failWith(502))).toEqual({
      status: 502,
      code: "SERVER_ERROR",
      message: "",
    });
    expect(await readApiError(new Error("not http"))).toBeNull();
  });

  test("people see the server's words only when they were written for people", async () => {
    const fallback = "Couldn't save that.";
    const cases: Array<[number, unknown, string]> = [
      [
        400,
        { error: { code: "VALIDATION_ERROR", message: "Name is too long" } },
        "Name is too long",
      ],
      [429, { error: { code: "RATE_LIMITED", message: "Slow down" } }, "Slow down"],
      [429, { error: { code: "RATE_LIMITED", message: "" } }, "Too many tries. Wait a moment."],
      [404, { error: { code: "NOT_FOUND", message: "Resource not found" } }, "Resource not found"],
      [403, { error: { code: "CSRF_TOKEN_INVALID", message: "" } }, fallback],
      [500, { error: { code: "SERVER_ERROR", message: "db exploded" } }, fallback],
    ];
    for (const [status, body, expected] of cases) {
      expect(await getErrorMessage(await failWith(status, body), fallback)).toBe(expected);
    }
  });

  test("a request that never reached the server says so when offline", async () => {
    expect(await getErrorMessage(new TypeError("fetch failed"), "Try again.")).toBe("Try again.");
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    expect(await getErrorMessage(new TypeError("fetch failed"), "Try again.")).toMatch(/offline/);
  });
});

describe("losing the session", () => {
  test("a signed-in page goes to sign in and remembers where it was", () => {
    expect(loginRedirectFor("/profiles/3/edit", "?tab=songs")).toBe(
      "/login?next=%2Fprofiles%2F3%2Fedit%3Ftab%3Dsongs"
    );
  });

  test("a public page stays put", () => {
    for (const path of ["/", "/login", "/verify-email/confirm", "/reset-password"]) {
      expect(loginRedirectFor(path), path).toBeNull();
    }
    // jsdom starts on "/", a public page, so this must not try to navigate.
    expect(() => redirectToLogin()).not.toThrow();
  });
});
