import { describe, test, expect } from "vitest";
import { Hono } from "hono";
import pino from "pino";
import { Writable } from "node:stream";
import { errorHandler, getRequestID, requestContext } from "./request-context";
import { ErrorKind, ServiceError } from "../services/errors";

interface LogLine {
  level: string;
  msg: string;
  status_code?: number;
  request_id?: string;
  user_id?: number;
  panic?: string;
}

/** A pino logger writing into an array, so log decisions can be asserted. */
function capturingLogger(): { logger: pino.Logger; lines: LogLine[] } {
  const lines: LogLine[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(JSON.parse(String(chunk)) as LogLine);
      cb();
    },
  });
  const logger = pino(
    { level: "debug", formatters: { level: (label) => ({ level: label }) } },
    stream
  );
  return { logger, lines };
}

describe("requestContext", () => {
  test("logs 2xx at info", async () => {
    const { logger, lines } = capturingLogger();
    const app = new Hono();
    app.use("*", requestContext(logger));
    app.get("/ok", (c) => c.json({ ok: true }));

    await app.request("/ok");
    expect(lines.at(-1)!.level).toBe("info");
    expect(lines.at(-1)!.status_code).toBe(200);
  });

  test("logs 4xx at warn", async () => {
    const { logger, lines } = capturingLogger();
    const app = new Hono();
    app.use("*", requestContext(logger));
    app.get("/bad", (c) => c.json({ error: true }, 400));

    await app.request("/bad");
    expect(lines.at(-1)!.level).toBe("warn");
  });

  test("logs 5xx at error", async () => {
    const { logger, lines } = capturingLogger();
    const app = new Hono();
    app.use("*", requestContext(logger));
    app.get("/boom", (c) => c.json({ error: true }, 500));

    await app.request("/boom");
    expect(lines.at(-1)!.level).toBe("error");
  });

  test("includes the user id once authentication has set one", async () => {
    const { logger, lines } = capturingLogger();
    const app = new Hono();
    app.use("*", requestContext(logger));
    app.get("/who", (c) => {
      c.set("userId" as never, 42 as never);
      return c.json({ ok: true });
    });

    await app.request("/who");
    expect(lines.at(-1)!.user_id).toBe(42);
  });

  test("omits the user id on anonymous requests", async () => {
    const { logger, lines } = capturingLogger();
    const app = new Hono();
    app.use("*", requestContext(logger));
    app.get("/anon", (c) => c.json({ ok: true }));

    await app.request("/anon");
    expect(lines.at(-1)!.user_id).toBeUndefined();
  });
});

describe("errorHandler", () => {
  test("turns a thrown error into the JSON 500 envelope", async () => {
    const { logger, lines } = capturingLogger();
    const app = new Hono();
    app.onError(errorHandler(logger));
    app.get("/throw", () => {
      throw new Error("kaboom");
    });

    const res = await app.request("/throw");
    expect(res.status).toBe(500);
    // Hono's default handler answers with plain text; every other error in this
    // API is a JSON envelope, and the client parses it as one.
    expect(await res.json()).toEqual({
      error: { code: "SERVER_ERROR", message: "Internal server error" },
    });

    const logged = lines.at(-1)!;
    expect(logged.level).toBe("error");
    expect(logged.panic).toContain("kaboom");
  });

  test("handles an Error subclass, such as a ServiceError", async () => {
    const { logger } = capturingLogger();
    const app = new Hono();
    app.onError(errorHandler(logger));
    app.get("/throw", () => {
      throw new ServiceError(ErrorKind.NotFound, "escaped the controller");
    });

    const res = await app.request("/throw");
    expect(res.status).toBe(500);
    expect(await res.json()).toHaveProperty("error.code", "SERVER_ERROR");
  });

  test("handles an async rejection from a handler", async () => {
    const { logger } = capturingLogger();
    const app = new Hono();
    app.onError(errorHandler(logger));
    app.get("/reject", async () => {
      await Promise.resolve();
      throw new Error("late failure");
    });

    expect((await app.request("/reject")).status).toBe(500);
  });

  test("leaves successful responses alone", async () => {
    const { logger } = capturingLogger();
    const app = new Hono();
    app.onError(errorHandler(logger));
    app.get("/fine", (c) => c.json({ ok: true }));

    expect((await app.request("/fine")).status).toBe(200);
  });
});

describe("getRequestID", () => {
  test("returns the id set by the middleware", async () => {
    const { logger } = capturingLogger();
    const app = new Hono();
    app.use("*", requestContext(logger));
    app.get("/id", (c) => c.json({ id: getRequestID(c) }));

    const res = await app.request("/id", { headers: { "X-Request-ID": "known-id" } });
    expect(await res.json()).toEqual({ id: "known-id" });
  });

  test("returns an empty string when nothing set one", async () => {
    const app = new Hono();
    app.get("/id", (c) => c.json({ id: getRequestID(c) }));

    const res = await app.request("/id");
    expect(await res.json()).toEqual({ id: "" });
  });
});
