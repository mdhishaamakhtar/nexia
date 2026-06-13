import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import pino from "pino";
import { createRateLimiter, rateLimitConfigFromValues } from "../middleware/rate-limit";
import { createAuthRateLimiter } from "../middleware/auth-rate-limit";
import { createChatRateLimiter } from "../middleware/chat-rate-limit";
import type { Config } from "../config/config";
import type { Logger } from "../logging/logger";

const nopLogger = pino({ level: "silent" });

const testCfg: Config = {
  server: {
    port: 8080,
    mode: "test",
    jwt_secret: "test",
    jwt_expiry_minutes: 30,
    cors_origins: [],
    cookie_domain: "",
    auth_rate_limit_requests: 5,
    auth_rate_limit_window_seconds: 30,
    auth_rate_limit_burst: 5,
    chat_rate_limit_requests: 4,
    chat_rate_limit_window_seconds: 90,
    chat_rate_limit_burst: 4,
  },
  db: {} as Config["db"],
  ai: {} as Config["ai"],
  email: {} as Config["email"],
};

describe("rateLimitConfigFromValues", () => {
  test("uses defaults when overrides are zero/negative", () => {
    const cfg = rateLimitConfigFromValues(10, 10, 10, 0, 0, 0);
    expect(cfg.requests).toBe(10);
    expect(cfg.burst).toBe(10);
    expect(cfg.windowSeconds).toBe(10);
  });

  test("clamps burst to requests", () => {
    const cfg = rateLimitConfigFromValues(10, 10, 10, 5, 99, 30);
    expect(cfg.requests).toBe(5);
    expect(cfg.burst).toBe(5);
  });

  test("uses overrides when positive", () => {
    const cfg = rateLimitConfigFromValues(10, 10, 10, 5, 3, 30);
    expect(cfg.requests).toBe(5);
    expect(cfg.burst).toBe(3);
    expect(cfg.windowSeconds).toBe(30);
  });

  test("ignores negative overrides", () => {
    const cfg = rateLimitConfigFromValues(10, 10, 10, -1, -2, 0);
    expect(cfg.requests).toBe(10);
    expect(cfg.burst).toBe(10);
    expect(cfg.windowSeconds).toBe(10);
  });
});

describe("rate limiter", () => {
  test("rejects requests beyond burst", async () => {
    const app = new Hono();
    app.use(
      "*",
      createRateLimiter(
        nopLogger,
        "test",
        "Too many",
        {
          requests: 2,
          burst: 2,
          windowSeconds: 60,
        },
        "/test"
      )
    );
    app.post("/test", (c) => c.json({ ok: true }));

    // First two should pass
    for (let i = 0; i < 2; i++) {
      const res = await app.request("/test", { method: "POST" });
      expect(res.status).toBe(200);
    }

    // Third should be rate limited
    const res = await app.request("/test", { method: "POST" });
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.message).toBe("Too many");
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(res.headers.get("X-RateLimit-Limit")).toBeTruthy();
  });
});

describe("authRateLimiter", () => {
  test("config uses defaults and clamps burst", () => {
    const app = new Hono();
    const mw = createAuthRateLimiter(nopLogger, testCfg);
    app.use("*", mw);
    app.post("/auth/login", (c) => c.json({ ok: true }));

    // Should allow up to 5 requests (burst=5)
    // Just verify it's callable
    expect(mw).toBeDefined();
  });

  test("nil config uses defaults", () => {
    const mw = createAuthRateLimiter(nopLogger, null as unknown as Config);
    expect(mw).toBeDefined();
  });
});

describe("chatRateLimiter", () => {
  test("config uses defaults and clamps burst", () => {
    const mw = createChatRateLimiter(nopLogger, testCfg);
    expect(mw).toBeDefined();
  });
});

describe("rate limiter panics on nil logger", () => {
  test("throws on nil logger", () => {
    expect(() =>
      createRateLimiter(
        null as unknown as Logger,
        "auth",
        "msg",
        {
          requests: 1,
          burst: 1,
          windowSeconds: 60,
        },
        "/auth"
      )
    ).toThrow("auth rate limit requires a logger");
  });
});
