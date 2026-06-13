import { z } from "zod";

export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "ACCOUNT_NOT_FOUND",
  "EMAIL_NOT_VERIFIED",
  "CSRF_TOKEN_MISSING",
  "CSRF_TOKEN_INVALID",
  "NOT_FOUND",
  "EMAIL_CONFLICT",
  "RATE_LIMITED",
  "AI_UNAVAILABLE",
  "SERVER_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
