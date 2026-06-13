import { describe, test, expect } from "bun:test";
import {
  ServiceError,
  ErrorKind,
  isServiceError,
  errValidation,
  errNotFound,
  errUnauthorized,
  errAccountNotFound,
  errAIUnavailable,
  errEmailNotVerified,
  errEmailConflict,
} from "../services/errors";
import { respondWithServiceError, respondError } from "../utils/http";

describe("service errors", () => {
  test("error kind constants", () => {
    expect(ErrorKind.NotFound).toBe("not_found");
    expect(ErrorKind.Unauthorized).toBe("unauthorized");
    expect(ErrorKind.Validation).toBe("validation");
  });

  test("ServiceError constructor", () => {
    const err = new ServiceError(ErrorKind.NotFound);
    expect(err.kind).toBe("not_found");
    expect(err.message).toBe("not_found");
    expect(err.name).toBe("ServiceError");
  });

  test("ServiceError with custom message", () => {
    const err = new ServiceError(ErrorKind.Validation, "Bad input");
    expect(err.message).toBe("Bad input");
  });

  test("isServiceError type guard", () => {
    expect(isServiceError(new ServiceError(ErrorKind.NotFound))).toBe(true);
    expect(isServiceError(new Error("regular"))).toBe(false);
    expect(isServiceError("string")).toBe(false);
  });

  test("errValidation helper", () => {
    const err = errValidation("Too many songs");
    expect(err.kind).toBe(ErrorKind.Validation);
    expect(err.message).toBe("Too many songs");
  });

  test("errNotFound helper", () => {
    const err = errNotFound();
    expect(err.kind).toBe(ErrorKind.NotFound);
  });

  test("errUnauthorized helper", () => {
    const err = errUnauthorized();
    expect(err.kind).toBe(ErrorKind.Unauthorized);
  });
});

// respondWithServiceError/respondError now use new Response() directly
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const c = undefined as any;

async function readBody(resp: Response): Promise<{ error: { code: string; message: string } }> {
  return resp.json() as Promise<{ error: { code: string; message: string } }>;
}

describe("respondWithServiceError", () => {
  const cases = [
    { err: errAccountNotFound(), status: 401, code: "ACCOUNT_NOT_FOUND" },
    { err: errUnauthorized(), status: 401, code: "UNAUTHORIZED" },
    { err: errValidation("bad request"), status: 400, code: "VALIDATION_ERROR" },
    { err: errNotFound(), status: 404, code: "NOT_FOUND" },
    { err: errAIUnavailable(), status: 503, code: "AI_UNAVAILABLE" },
    { err: errEmailNotVerified(), status: 403, code: "EMAIL_NOT_VERIFIED" },
    { err: errEmailConflict(), status: 409, code: "EMAIL_CONFLICT" },
    { err: new Error("something broke"), status: 500, code: "SERVER_ERROR" },
  ];

  for (const tc of cases) {
    test(`${tc.code} → ${tc.status}`, async () => {
      const resp = respondWithServiceError(c, tc.err);
      expect(resp.status).toBe(tc.status);
      const body = await readBody(resp);
      expect(body.error.code).toBe(tc.code);
      expect(typeof body.error.message).toBe("string");
    });
  }
});

describe("respondError", () => {
  test("writes structured error response", async () => {
    const resp = respondError(c, 400, "BAD_REQUEST", "Something wrong");
    expect(resp.status).toBe(400);
    const body = await readBody(resp);
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.message).toBe("Something wrong");
  });
});
