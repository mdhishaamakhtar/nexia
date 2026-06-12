import { api } from "@/shared/api/client";
import type { AuthResponse, AuthSessionResponse } from "@/shared/types/api";

export async function signup(email: string, password: string): Promise<void> {
  await api.post("auth/signup", { json: { email, password } });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return api.post("auth/login", { json: { email, password } }).json<AuthResponse>();
}

export async function verifyEmail(token: string): Promise<void> {
  await api.get("auth/verify-email", { searchParams: { token } });
}

export async function getSession() {
  return api.get("auth/me").json<AuthSessionResponse>();
}

export async function logoutSession() {
  await api.post("auth/logout");
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post("auth/forgot-password", { json: { email } });
}

export async function resetPassword(token: string, newPassword: string) {
  await api.post("auth/reset-password", { json: { token, new_password: newPassword } });
}
