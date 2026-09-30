import ky, { HTTPError } from "ky";
import type { ErrorCode, ErrorResponse } from "@nexia/shared";
import { readCookie, CSRF_COOKIE_NAME } from "@/shared/api/cookies";

export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

/** Paths where a 401 is an answer to show, not a reason to leave the page. */
const PUBLIC_PATHS = ["/", "/login", "/forgot-password", "/reset-password", "/verify-email"];

/** Where to sign in from `pathname` and come back, or null if it is a public page. */
export function loginRedirectFor(pathname: string, search = ""): string | null {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return `/login?next=${encodeURIComponent(`${pathname}${search}`)}`;
}

/**
 * Sends the browser to sign in, remembering where it was so it can come back.
 * Used when a request made from a signed-in page finds the session gone.
 */
export function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const target = loginRedirectFor(window.location.pathname, window.location.search);
  if (target) window.location.assign(target);
}

/**
 * The one HTTP client. No default Content-Type: ky sets it when there is a
 * JSON body, and on a GET it only turned every cross-origin read into a
 * preflight plus the request. Retries are left to React Query, so a failing
 * request is not attempted six times.
 */
export const api = ky.create({
  prefixUrl: `${BACKEND_URL}/api/v1`,
  credentials: "include",
  retry: 0,
  hooks: {
    beforeRequest: [
      (request) => {
        if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())) {
          const csrfToken = readCookie(CSRF_COOKIE_NAME);
          if (csrfToken) request.headers.set("X-CSRF-Token", csrfToken);
        }
      },
    ],
    beforeError: [
      (error) => {
        if (error.response.status === 401 && !error.request.url.includes("/auth/")) {
          redirectToLogin();
        }
        return error;
      },
    ],
  },
});

export interface ApiError {
  status: number;
  code: ErrorCode | string;
  message: string;
}

/** The `{ error: { code, message } }` envelope of a failed request, if it has one. */
export async function readApiError(error: unknown): Promise<ApiError | null> {
  if (!(error instanceof HTTPError)) return null;
  try {
    const data = (await error.response.clone().json()) as ErrorResponse;
    return { status: error.response.status, code: data.error.code, message: data.error.message };
  } catch {
    return { status: error.response.status, code: "SERVER_ERROR", message: "" };
  }
}

/** A message for a person: the server's own when it wrote one for people, else `fallback`. */
export async function getErrorMessage(error: unknown, fallback: string): Promise<string> {
  const apiError = await readApiError(error);
  if (!apiError)
    return navigator.onLine === false ? "You're offline. Check your connection." : fallback;
  if (apiError.code === "RATE_LIMITED") return apiError.message || "Too many tries. Wait a moment.";
  if (apiError.code === "VALIDATION_ERROR" && apiError.message) return apiError.message;
  if (apiError.status >= 500) return fallback;
  return apiError.message || fallback;
}
