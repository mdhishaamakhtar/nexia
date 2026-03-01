import { api } from "@/shared/api/client";
import type { AuthResponse, AuthSessionResponse } from "@/shared/types/api";

export async function signup(email: string, password: string): Promise<void> {
  await api.post("/auth/signup", { email, password });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/login", { email, password });
  return response.data;
}

export async function verifyEmail(token: string): Promise<void> {
  await api.get("/auth/verify-email", { params: { token } });
}

export async function getSession() {
  const response = await api.get<AuthSessionResponse>("/auth/me");
  return response.data;
}

export async function logoutSession() {
  await api.post("/auth/logout");
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, newPassword: string) {
  await api.post("/auth/reset-password", { token, new_password: newPassword });
}
