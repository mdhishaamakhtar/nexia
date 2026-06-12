import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import {
  ServiceError,
  ErrorKind,
  isServiceError,
  respondWithServiceError,
  respondError,
  errValidation,
  errNotFound,
  errUnauthorized,
  errAccountNotFound,
  errAIUnavailable,
  errEmailNotVerified,
  errEmailConflict,
} from "../services/errors";

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

describe("respondWithServiceError", () => {
  function makeContext() {
    let _body: unknown;
    let _status: number;
    const c = {
      json: (data: unknown, status?: number) => {
        _body = data;
        _status = status ?? 200;
        return new Response(JSON.stringify(data), { status: status ?? 200 });
      },
    };
    return { 
      c, 
      getBody: () => _body, 
      getStatus: () => _status,
    };
  }

  const cases = [
    {
      err: errAccountNotFound(),
      expectedStatus: 401,
      expectedCode: "ACCOUNT_NOT_FOUND",
    },
    {
      err: errUnauthorized(),
      expectedStatus: 401,
      expectedCode: "UNAUTHORIZED",
    },
    {
      err: errValidation("bad request"),
      expectedStatus: 400,
      expectedCode: "VALIDATION_ERROR",
    },
    {
      err: errNotFound(),
      expectedStatus: 404,
      expectedCode: "NOT_FOUND",
    },
    {
      err: errAIUnavailable(),
      expectedStatus: 503,
      expectedCode: "AI_UNAVAILABLE",
    },
    {
      err: errEmailNotVerified(),
      expectedStatus: 403,
      expectedCode: "EMAIL_NOT_VERIFIED",
    },
    {
      err: errEmailConflict(),
      expectedStatus: 409,
      expectedCode: "EMAIL_CONFLICT",
    },
    {
      err: new Error("something broke"),
      expectedStatus: 500,
      expectedCode: "SERVER_ERROR",
    },
  ];

  for (const tc of cases) {
    test(`${tc.expectedCode} → ${tc.expectedStatus}`, () => {
      const { c, getBody, getStatus } = makeContext();
      const resp = respondWithServiceError(c as Parameters<typeof respondWithServiceError>[0], tc.err);
      expect(resp.status).toBe(tc.expectedStatus);
      const body = getBody() as { error: { code: string; message: string } };
      expect(body.error.code).toBe(tc.expectedCode);
      expect(typeof body.error.message).toBe("string");
    });
  }
});

describe("respondError", () => {
  test("writes structured error response", () => {
    let _body: unknown;
    const c = {
      json: (d: unknown, s?: number) => {
        _body = d;
        return new Response(JSON.stringify(d), { status: s ?? 200 });
      },
    };
    const resp = respondError(c as Parameters<typeof respondError>[0], 400, "BAD_REQUEST", "Something wrong") as Response;
    expect(resp.status).toBe(400);
    const b = _body as { error: { code: string; message: string } };
    expect(b.error.code).toBe("BAD_REQUEST");
    expect(b.error.message).toBe("Something wrong");
  });
});
