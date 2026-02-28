import { api } from "@/shared/api/client";
import type { AuthResponse, AuthSessionResponse, ForgotPasswordResponse } from "@/shared/types/api";

export async function loginOrSignup(username: string, password: string) {
  const response = await api.post<AuthResponse>("/auth", { username, password });
  return response.data;
}

export async function getSession() {
  const response = await api.get<AuthSessionResponse>("/auth/me");
  return response.data;
}

export async function logoutSession() {
  await api.post("/auth/logout");
}

export async function forgotPassword(username: string) {
  const response = await api.post<ForgotPasswordResponse>("/auth/forgot-password", { username });
  return response.data;
}

export async function resetPassword(token: string, newPassword: string) {
  await api.post("/auth/reset-password", { token, new_password: newPassword });
}
