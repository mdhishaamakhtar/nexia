/**
 * What went wrong with a chat request, in words that say what to do. The
 * transport throws the response body as the error message, so the API's
 * `{ error: { code } }` envelope is read back out of it.
 */
export interface ChatProblem {
  message: string;
  /** Whether sending again could work. */
  retry: boolean;
}

export function describeChatError(error: Error | undefined): ChatProblem {
  let code: string | undefined;
  try {
    code = (JSON.parse(error?.message ?? "") as { error?: { code?: string } }).error?.code;
  } catch {
    // Not JSON: a network failure or a stream that broke mid-reply.
  }

  switch (code) {
    case "RATE_LIMITED":
      return {
        message: "That's a lot of questions at once. Give it a few seconds, then try again.",
        retry: true,
      };
    case "AI_UNAVAILABLE":
      return {
        message: "Chat isn't set up on this server yet, so Nexia can't answer right now.",
        retry: false,
      };
    case "PAYLOAD_TOO_LARGE":
      return {
        message: "This conversation has grown too long. Start a new one to keep going.",
        retry: false,
      };
    case "VALIDATION_ERROR":
      return {
        message: "Something in this conversation couldn't be read. Start a new one to keep going.",
        retry: false,
      };
    default:
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return { message: "You're offline. Reconnect and try again.", retry: true };
      }
      return { message: "The reply didn't come through. Try again.", retry: true };
  }
}
