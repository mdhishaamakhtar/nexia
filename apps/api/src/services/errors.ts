export const ErrorKind = {
  NotFound: "not_found",
  Unauthorized: "unauthorized",
  AccountNotFound: "account_not_found",
  Validation: "validation",
  AIUnavailable: "ai_unavailable",
  EmailNotVerified: "email_not_verified",
  EmailConflict: "email_conflict",
} as const;

export type ErrorKind = (typeof ErrorKind)[keyof typeof ErrorKind];

export class ServiceError extends Error {
  constructor(
    public kind: ErrorKind,
    message?: string
  ) {
    super(message ?? kind);
    this.name = "ServiceError";
  }
}

export function errNotFound(msg?: string): ServiceError {
  return new ServiceError(ErrorKind.NotFound, msg);
}
export function errUnauthorized(msg?: string): ServiceError {
  return new ServiceError(ErrorKind.Unauthorized, msg);
}
export function errAccountNotFound(msg?: string): ServiceError {
  return new ServiceError(ErrorKind.AccountNotFound, msg);
}
export function errValidation(msg: string): ServiceError {
  return new ServiceError(ErrorKind.Validation, msg);
}
export function errAIUnavailable(msg?: string): ServiceError {
  return new ServiceError(ErrorKind.AIUnavailable, msg);
}
export function errEmailNotVerified(msg?: string): ServiceError {
  return new ServiceError(ErrorKind.EmailNotVerified, msg);
}
export function errEmailConflict(msg?: string): ServiceError {
  return new ServiceError(ErrorKind.EmailConflict, msg);
}

export function isServiceError(err: unknown): err is ServiceError {
  return err instanceof ServiceError;
}

import type { Context } from "hono";

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
