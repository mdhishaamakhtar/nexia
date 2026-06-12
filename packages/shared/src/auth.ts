import { z } from "zod";

export const signupRequestSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const loginRequestSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().min(1),
});

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  new_password: z.string().min(1),
});

export const messageResponseSchema = z.object({
  message: z.string(),
});

export const loginResponseSchema = z.object({
  token: z.string(),
});

export const authSessionSchema = z.object({
  authenticated: z.boolean(),
  user_id: z.number(),
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type MessageResponse = z.infer<typeof messageResponseSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
