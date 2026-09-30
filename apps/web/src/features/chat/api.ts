import { DefaultChatTransport, type UIMessage } from "ai";
import { BACKEND_URL, redirectToLogin } from "@/shared/api/client";
import { csrfHeaders } from "@/shared/api/cookies";

/**
 * Transport for the chat endpoint: sends the session cookie and the
 * CSRF header, and treats a 401 the way the rest of the app does — back to
 * sign-in, remembering the page — instead of as a generic failure.
 */
export function createChatTransport() {
  return new DefaultChatTransport<UIMessage>({
    api: `${BACKEND_URL}/api/v1/chat`,
    credentials: "include",
    headers: csrfHeaders,
    fetch: async (input, init) => {
      const response = await fetch(input, init);
      if (response.status === 401) redirectToLogin();
      return response;
    },
  });
}
