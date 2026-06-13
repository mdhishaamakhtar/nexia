import type { Context } from "hono";
import { isServiceError, ErrorKind } from "../services/errors";

export function respondWithServiceError(c: Context, err: unknown): Response {
  if (isServiceError(err)) {
    switch (err.kind) {
      case ErrorKind.AccountNotFound:
        return respondError(c, 401, "ACCOUNT_NOT_FOUND", "No account found with that email");
      case ErrorKind.Unauthorized:
        return respondError(c, 401, "UNAUTHORIZED", "Invalid credentials");
      case ErrorKind.Validation:
        return respondError(c, 400, "VALIDATION_ERROR", err.message);
      case ErrorKind.NotFound:
        return respondError(c, 404, "NOT_FOUND", "Resource not found");
      case ErrorKind.AIUnavailable:
        return respondError(c, 503, "AI_UNAVAILABLE", "AI service unavailable");
      case ErrorKind.EmailUnavailable:
        return respondError(c, 503, "EMAIL_UNAVAILABLE", "Email service unavailable");
      case ErrorKind.EmailNotVerified:
        return respondError(
          c,
          403,
          "EMAIL_NOT_VERIFIED",
          "Please verify your email before signing in"
        );
      case ErrorKind.EmailConflict:
        return respondError(c, 409, "EMAIL_CONFLICT", "An account with that email already exists");
    }
  }
  return respondError(
    c,
    500,
    "SERVER_ERROR",
    err instanceof Error ? err.message : "Internal server error"
  );
}

export function respondError(_c: Context, status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
