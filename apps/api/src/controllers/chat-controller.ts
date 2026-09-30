import { Hono } from "hono";
import { createUIMessageStreamResponse, toUIMessageStream } from "ai";
import { z } from "zod";
import type { ChatAgent } from "../ai/agent";
import type { AppEnv } from "../middleware/auth";
import { parseJsonBody } from "../utils/validation";

/** The envelope only; each message is validated against the tool schemas by the agent. */
const chatRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1, "messages array is required").max(500),
});

export function createChatController(agent: ChatAgent) {
  const app = new Hono<AppEnv>();

  app.post("/", async (c) => {
    const { messages } = await parseJsonBody(c, chatRequestSchema);
    const result = await agent.respond({
      userId: c.get("userId"),
      messages,
      abortSignal: c.req.raw.signal,
    });
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  });

  return app;
}
