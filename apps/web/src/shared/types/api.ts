import type { ErrorResponse, ErrorCode, AuthSession, LoginResponse, MessageResponse } from "@nexia/shared";

export { errorResponseSchema } from "@nexia/shared";
export type { ErrorResponse, ErrorCode, AuthSession, LoginResponse, MessageResponse };

// Thin aliases for existing frontend code
export type ApiErrorResponse = ErrorResponse;
export type AuthResponse = LoginResponse;
export type AuthSessionResponse = AuthSession;

// Frontend-only type: parsed response from the chat SSE stream
export type ChatResponse = {
  response: string;
};
