import axios from "axios";
import type { ApiErrorResponse } from "@/shared/types/api";

export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const requestURL = String(error.config?.url ?? "");
      const isSessionProbe = requestURL.includes("/auth/me");
      if (!isSessionProbe && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as { response?: { data?: ApiErrorResponse } };
  return apiError.response?.data?.error?.message ?? fallback;
}
