export { type ErrorResponse, type ErrorCode, errorResponseSchema } from "@nexia/shared";
export type { AuthSession, LoginResponse, MessageResponse } from "@nexia/shared";

export type ApiErrorResponse = import("@nexia/shared").ErrorResponse;

export type AuthResponse = {
  token: string;
};

export type AuthSessionResponse = {
  authenticated: boolean;
  user_id: number;
};

export type ChatResponse = {
  response: string;
};
