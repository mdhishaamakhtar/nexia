import { describe, test, expect } from "vitest";
import { Hono } from "hono";
import { createChatController } from "../controllers/chat-controller";
import { ChatAgent } from "../ai/agent";
import type { AppEnv } from "../middleware/auth";

describe("chat controller", () => {
  test("returns 503 when AI unavailable", async () => {
    const agent = new ChatAgent(null, null as never, null, null);
    const controller = createChatController(agent);

    const app = new Hono<AppEnv>();
    app.use("*", (c, next) => {
      c.set("userId", 1);
      return next();
    });
    app.route("/chat", controller);

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("AI_UNAVAILABLE");
  });

  test("returns 400 for empty messages", async () => {
    const agent = new ChatAgent(null, null as never, null, null);
    const controller = createChatController(agent);

    const app = new Hono<AppEnv>();
    app.use("*", (c, next) => {
      c.set("userId", 1);
      return next();
    });
    app.route("/chat", controller);

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });
    expect(res.status).toBe(400);
  });

  test("returns 401 without auth", async () => {
    const agent = new ChatAgent(null, null as never, null, null);
    const controller = createChatController(agent);

    const app = new Hono();
    app.route("/chat", controller);

    const res = await app.request("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
    });
    expect(res.status).toBe(401);
  });
});
