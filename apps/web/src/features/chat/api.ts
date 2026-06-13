import { DefaultChatTransport } from "ai";
import { csrfHeaders } from "@/shared/api/cookies";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

/**
 * Transport for the Nexia Intel chat endpoint. Sends the auth cookie
 * (credentials: include) and the CSRF header on every streamed request.
 */
export function createChatTransport() {
  return new DefaultChatTransport({
    api: `${BACKEND_URL}/api/v1/chat`,
    credentials: "include",
    headers: csrfHeaders,
  });
}
