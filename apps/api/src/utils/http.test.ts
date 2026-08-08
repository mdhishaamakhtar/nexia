import { describe, test, expect } from "vitest";
import { Hono } from "hono";
import { respondError, respondWithServiceError } from "./http";
import {
  errAIUnavailable,
  errAccountNotFound,
  errEmailConflict,
  errEmailNotVerified,
  errEmailUnavailable,
  errNotFound,
  errUnauthorized,
  errValidation,
  ServiceError,
} from "../services/errors";

/** Runs a handler through a real Hono request so the Response is genuine. */
async function respond(fn: (c: Parameters<typeof respondError>[0]) => Response) {
  const app = new Hono();
  app.get("/x", (c) => fn(c));
  const res = await app.request("/x");
  return {
    status: res.status,
    body: (await res.json()) as { error: { code: string; message: string } },
  };
}

describe("respondWithServiceError", () => {
  const cases = [
    [errAccountNotFound(), 401, "ACCOUNT_NOT_FOUND"],
    [errUnauthorized(), 401, "UNAUTHORIZED"],
    [errValidation("bad input"), 400, "VALIDATION_ERROR"],
    [errNotFound(), 404, "NOT_FOUND"],
    [errAIUnavailable(), 503, "AI_UNAVAILABLE"],
    [errEmailUnavailable(), 503, "EMAIL_UNAVAILABLE"],
    [errEmailNotVerified(), 403, "EMAIL_NOT_VERIFIED"],
    [errEmailConflict(), 409, "EMAIL_CONFLICT"],
  ] as const;

  for (const [err, status, code] of cases) {
    test(`maps ${err.kind} to ${status} ${code}`, async () => {
      const res = await respond((c) => respondWithServiceError(c, err));
      expect(res.status).toBe(status);
      expect(res.body.error.code).toBe(code);
    });
  }

  test("passes a validation message through to the client", async () => {
    const res = await respond((c) => respondWithServiceError(c, errValidation("top songs: max 3")));
    expect(res.body.error.message).toBe("top songs: max 3");
  });

  test("maps an unrecognised ServiceError kind to 500", async () => {
    const rogue = new ServiceError("something_new" as never, "unexpected");
    const res = await respond((c) => respondWithServiceError(c, rogue));
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("SERVER_ERROR");
  });

  test("maps a plain Error to 500, keeping its message", async () => {
    const res = await respond((c) => respondWithServiceError(c, new Error("connection reset")));
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe("connection reset");
  });

  test("maps a thrown non-Error to a generic 500", async () => {
    const res = await respond((c) => respondWithServiceError(c, "just a string"));
    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe("Internal server error");
  });
});

describe("respondError", () => {
  test("returns the standard error envelope as JSON", async () => {
    const res = await respond((c) => respondError(c, 418, "TEAPOT", "short and stout"));
    expect(res.status).toBe(418);
    expect(res.body).toEqual({ error: { code: "TEAPOT", message: "short and stout" } });
  });
});
