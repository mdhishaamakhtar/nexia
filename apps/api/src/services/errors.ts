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
    message?: string,
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

export function respondWithServiceError(
  c: { json: (data: unknown, status?: number) => void },
  err: unknown,
): void {
  if (isServiceError(err)) {
    switch (err.kind) {
      case ErrorKind.AccountNotFound:
        respondError(c, 401, "ACCOUNT_NOT_FOUND", "No account found with that email");
        return;
      case ErrorKind.Unauthorized:
        respondError(c, 401, "UNAUTHORIZED", "Invalid credentials");
        return;
      case ErrorKind.Validation:
        respondError(c, 400, "VALIDATION_ERROR", err.message);
        return;
      case ErrorKind.NotFound:
        respondError(c, 404, "NOT_FOUND", "Resource not found");
        return;
      case ErrorKind.AIUnavailable:
        respondError(c, 503, "AI_UNAVAILABLE", "AI service unavailable");
        return;
      case ErrorKind.EmailNotVerified:
        respondError(c, 403, "EMAIL_NOT_VERIFIED", "Please verify your email before signing in");
        return;
      case ErrorKind.EmailConflict:
        respondError(c, 409, "EMAIL_CONFLICT", "An account with that email already exists");
        return;
    }
  }
  respondError(c, 500, "SERVER_ERROR", err instanceof Error ? err.message : "Internal server error");
}

export function respondError(
  c: { json: (data: unknown, status?: number) => void },
  status: number,
  code: string,
  message: string,
): void {
  c.json({ error: { code, message } }, status);
}
