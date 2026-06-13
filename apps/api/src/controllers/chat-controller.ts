import { Hono } from "hono";
import type { ChatAgent } from "../ai/agent";
import { respondWithServiceError } from "../services/errors";
import { getUserId } from "../middleware/auth";

export function createChatController(agent: ChatAgent) {
  const app = new Hono();

  app.post("/", async (c) => {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, 401);
    }

    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON" } }, 400);
    }

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return c.json(
        { error: { code: "VALIDATION_ERROR", message: "messages array is required" } },
        400
      );
    }

    try {
      const result = await agent.respond({ userId, messages: body.messages });
      return result.toUIMessageStreamResponse();
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  return app;
}
