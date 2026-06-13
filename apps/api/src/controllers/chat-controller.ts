import { Hono } from "hono";
import type { UIMessage } from "ai";
import type { ChatAgent } from "../ai/agent";
import { respondWithServiceError, respondError } from "../services/errors";
import { getUserId } from "../middleware/auth";

export function createChatController(agent: ChatAgent) {
  const app = new Hono();

  app.post("/", async (c) => {
    const userId = getUserId(c);
    if (!userId) return respondError(c, 401, "UNAUTHORIZED", "Authentication required");

    let body: { messages?: unknown };
    try {
      body = await c.req.json();
    } catch {
      return respondError(c, 400, "BAD_REQUEST", "Invalid JSON body");
    }

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return respondError(c, 400, "VALIDATION_ERROR", "messages array is required");
    }

    try {
      const result = await agent.respond({ userId, messages: body.messages as UIMessage[] });
      return result.toUIMessageStreamResponse();
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  return app;
}
