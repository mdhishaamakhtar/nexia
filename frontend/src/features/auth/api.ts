import { api } from "@/shared/api/client";
import type { AuthResponse, AuthSessionResponse } from "@/shared/types/api";

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
