import type { ErrorCode } from "@nexia/shared";

export const ErrorKind = {
  NotFound: "not_found",
  Unauthorized: "unauthorized",
  Validation: "validation",
  AIUnavailable: "ai_unavailable",
  EmailUnavailable: "email_unavailable",
  EmailNotVerified: "email_not_verified",
} as const;

export type ErrorKind = (typeof ErrorKind)[keyof typeof ErrorKind];

/**
 * An expected failure that crosses a layer boundary. The error handler turns it
 * into a response using `ERROR_RESPONSES`; anything that is not a ServiceError
 * is treated as a bug, logged with its stack, and answered with a generic 500.
 */
export class ServiceError extends Error {
  constructor(
    public kind: ErrorKind,
    message?: string
  ) {
    super(message ?? kind);
    this.name = "ServiceError";
  }
}

/**
 * The public face of each kind. `message: null` means the error's own message
 * is safe to show (validation text written for people); otherwise the fixed
 * text is used and the internal detail stays in the log.
 */
export const ERROR_RESPONSES: Record<
  ErrorKind,
  { status: 400 | 401 | 403 | 404 | 503; code: ErrorCode; message: string | null }
> = {
  [ErrorKind.NotFound]: { status: 404, code: "NOT_FOUND", message: "Resource not found" },
  [ErrorKind.Unauthorized]: {
    status: 401,
    code: "UNAUTHORIZED",
    message: "That email and password don't match",
  },
  [ErrorKind.Validation]: { status: 400, code: "VALIDATION_ERROR", message: null },
  [ErrorKind.AIUnavailable]: {
    status: 503,
    code: "AI_UNAVAILABLE",
    message: "Chat isn't available right now",
  },
  [ErrorKind.EmailUnavailable]: {
    status: 503,
    code: "EMAIL_UNAVAILABLE",
    message: "Email is unavailable right now",
  },
  [ErrorKind.EmailNotVerified]: {
    status: 403,
    code: "EMAIL_NOT_VERIFIED",
    message: "Please verify your email before signing in",
  },
};

export function errNotFound(msg?: string): ServiceError {
  return new ServiceError(ErrorKind.NotFound, msg);
}
export function errUnauthorized(msg?: string): ServiceError {
  return new ServiceError(ErrorKind.Unauthorized, msg);
}
export function errValidation(msg: string): ServiceError {
  return new ServiceError(ErrorKind.Validation, msg);
}
export function errAIUnavailable(msg?: string): ServiceError {
  return new ServiceError(ErrorKind.AIUnavailable, msg);
}
export function errEmailUnavailable(msg?: string): ServiceError {
  return new ServiceError(ErrorKind.EmailUnavailable, msg);
}
export function errEmailNotVerified(msg?: string): ServiceError {
  return new ServiceError(ErrorKind.EmailNotVerified, msg);
}

export function isServiceError(err: unknown): err is ServiceError {
  return err instanceof ServiceError;
}
