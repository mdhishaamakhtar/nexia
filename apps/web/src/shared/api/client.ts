import ky, { HTTPError } from "ky";
import type { ApiErrorResponse } from "@/shared/types/api";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const cookie of document.cookie.split(";")) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

export const api = ky.create({
  prefixUrl: `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080"}/api/v1`,
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  hooks: {
    beforeRequest: [
      (request) => {
        const method = request.method.toUpperCase();
        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
          const csrfToken = getCookie("nexia_csrf");
          if (csrfToken) {
            request.headers.set("X-CSRF-Token", csrfToken);
          }
        }
      },
    ],
    beforeError: [
      async (error) => {
        if (error.response.status === 401 && typeof window !== "undefined") {
          const isSessionProbe = error.request.url.includes("/auth/me");
          if (!isSessionProbe && window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
        return error;
      },
    ],
  },
});

export async function getErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof HTTPError) {
    try {
      const data = (await error.response.clone().json()) as ApiErrorResponse;
      return data?.error?.message ?? fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}
