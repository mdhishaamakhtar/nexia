import { describe, test, expect } from "vitest";
import { Hono } from "hono";
import pino from "pino";
import { clientAddress, createRateLimiter, type RateLimitOptions } from "./rate-limit";

const logger = pino({ level: "silent" });

/** A limiter on a manual clock, keyed by the `x-who` header. */
function limitedApp(opts: Partial<RateLimitOptions> = {}) {
  let clock = 1_000_000;
  const app = new Hono();
  app.use(
    "*",
    createRateLimiter({
      name: "test",
      message: "Too many",
      requests: 6,
      windowSeconds: 60,
      burst: 2,
      key: (c) => c.req.header("x-who") ?? "anon",
      logger,
      now: () => clock,
      ...opts,
    })
  );
  app.post("/x", (c) => c.json({ ok: true }));
  const hit = (who = "a") => app.request("/x", { method: "POST", headers: { "x-who": who } });
  return { hit, advance: (ms: number) => (clock += ms) };
}

describe("createRateLimiter", () => {
  test("allows the burst, then answers 429 with Retry-After", async () => {
    const { hit } = limitedApp();

    expect((await hit()).status).toBe(200);
    expect((await hit()).status).toBe(200);

    const limited = await hit();
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: { code: "RATE_LIMITED", message: "Too many" } });
    // 6 per 60s refills one token every 10s.
    expect(limited.headers.get("Retry-After")).toBe("10");
  });

  test("refills at the configured rate", async () => {
    const { hit, advance } = limitedApp();
    await hit();
    await hit();
    expect((await hit()).status).toBe(429);

    advance(10_000);
    expect((await hit()).status).toBe(200);
    expect((await hit()).status).toBe(429);
  });

  test("keeps separate buckets per key", async () => {
    const { hit } = limitedApp();
    await hit("a");
    await hit("a");
    expect((await hit("a")).status).toBe(429);
    expect((await hit("b")).status).toBe(200);
  });

  test("never lets the burst exceed the refill rate", async () => {
    const { hit } = limitedApp({ requests: 1, burst: 5 });
    expect((await hit()).status).toBe(200);
    expect((await hit()).status).toBe(429);
  });

  test("sweeping idle buckets keeps the active ones", async () => {
    const { hit, advance } = limitedApp();
    await hit("idle");
    advance(30_000);
    await hit("busy");
    await hit("busy");
    // A full window after "idle" was last seen, but only half for "busy".
    advance(31_000);
    expect((await hit("busy")).status).toBe(200);
    expect((await hit("busy")).status).toBe(200);
    expect((await hit("busy")).status).toBe(429);
  });

  test("forgets idle buckets after a window, which behaves like a full bucket", async () => {
    const { hit, advance } = limitedApp();
    await hit();
    await hit();
    advance(61_000);
    expect((await hit()).status).toBe(200);
    expect((await hit()).status).toBe(200);
  });
});

describe("clientAddress", () => {
  async function addressOf(headers: Record<string, string>, header: string) {
    const app = new Hono();
    app.get("/ip", (c) => c.text(clientAddress(c, header)));
    const res = await app.request("/ip", { headers });
    return res.text();
  }

  test("reads the proxy's header when one is configured", async () => {
    expect(await addressOf({ "x-real-ip": "203.0.113.7" }, "x-real-ip")).toBe("203.0.113.7");
    expect(await addressOf({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }, "x-forwarded-for")).toBe(
      "203.0.113.7"
    );
  });

  test("falls back to the socket when the proxy header is absent", async () => {
    expect(await addressOf({}, "x-real-ip")).toBe("unknown");
  });

  test("ignores client-sent headers when no proxy header is configured", async () => {
    // Without a trusted proxy, X-Forwarded-For is whatever the client wrote.
    expect(await addressOf({ "x-forwarded-for": "1.2.3.4" }, "")).toBe("unknown");
  });
});
