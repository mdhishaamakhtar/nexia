export const ErrorKind = {
  NotFound: "not_found",
  Unauthorized: "unauthorized",
  AccountNotFound: "account_not_found",
  Validation: "validation",
  AIUnavailable: "ai_unavailable",
  EmailUnavailable: "email_unavailable",
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
export function errEmailUnavailable(msg?: string): ServiceError {
  return new ServiceError(ErrorKind.EmailUnavailable, msg);
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
