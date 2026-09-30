import { HTTPError } from "ky";
import type { AuthSession } from "@nexia/shared";
import { api } from "@/shared/api/client";

export async function signup(email: string, password: string): Promise<void> {
  await api.post("auth/signup", { json: { email, password } });
}

export async function login(email: string, password: string): Promise<void> {
  await api.post("auth/login", { json: { email, password } });
}

export async function verifyEmail(token: string): Promise<void> {
  await api.get("auth/verify-email", { searchParams: { token } });
}

export async function resendVerification(email: string): Promise<void> {
  await api.post("auth/resend-verification", { json: { email } });
}

/** The current session, or null when there is none (a 401). Other failures throw. */
export async function getSession(): Promise<AuthSession | null> {
  try {
    return await api.get("auth/me").json<AuthSession>();
  } catch (err) {
    if (err instanceof HTTPError && err.response.status === 401) return null;
    throw err;
  }
}

export async function logoutSession(): Promise<void> {
  await api.post("auth/logout");
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post("auth/forgot-password", { json: { email } });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post("auth/reset-password", { json: { token, new_password: newPassword } });
}
