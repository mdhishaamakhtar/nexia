import { describe, test, expect } from "vitest";
import { Hono } from "hono";
import pino from "pino";
import { Writable } from "node:stream";
import { errorHandler, requestContext } from "./request-context";
import { ErrorKind, ServiceError } from "../services/errors";

interface LogLine {
  level: string;
  msg: string;
  status_code?: number;
  request_id?: string;
  user_id?: number;
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

describe("request ids", () => {
  test("echoes a well-formed caller id", async () => {
    const { logger, lines } = capturingLogger();
    const app = new Hono();
    app.use("*", requestContext(logger));
    app.get("/id", (c) => c.json({ ok: true }));

    const res = await app.request("/id", { headers: { "X-Request-ID": "known-id_1.2" } });
    expect(res.headers.get("X-Request-ID")).toBe("known-id_1.2");
    expect(lines.at(-1)!.request_id).toBe("known-id_1.2");
  });

  test("replaces an id that could inject into the logs", async () => {
    const { logger } = capturingLogger();
    const app = new Hono();
    app.use("*", requestContext(logger));
    app.get("/id", (c) => c.json({ ok: true }));

    const res = await app.request("/id", { headers: { "X-Request-ID": "bad id level=error" } });
    expect(res.headers.get("X-Request-ID")).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("errorHandler", () => {
  test("answers an unexpected error generically and logs its stack", async () => {
    const { logger, lines } = capturingLogger();
    const app = new Hono();
    app.onError(errorHandler(logger));
    app.get("/throw", () => {
      throw new Error('Failed query: insert into "profiles" values ($1)');
    });

    const res = await app.request("/throw");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("SERVER_ERROR");
    // The internal message never reaches the client…
    expect(body.error.message).not.toContain("Failed query");

    // …it goes to the log, with the stack.
    const logged = lines.at(-1)! as LogLine & { err?: { message: string; stack: string } };
    expect(logged.level).toBe("error");
    expect(logged.err?.message).toContain("Failed query");
    expect(logged.err?.stack).toContain("Error");
  });

  test("maps a ServiceError to its status and code", async () => {
    const { logger, lines } = capturingLogger();
    const app = new Hono();
    app.onError(errorHandler(logger));
    app.get("/missing", () => {
      throw new ServiceError(ErrorKind.NotFound, "internal detail");
    });
    app.get("/invalid", () => {
      throw new ServiceError(ErrorKind.Validation, "bio: Too long");
    });

    const missing = await app.request("/missing");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Resource not found" },
    });

    // Validation text is written for people, so it is passed through.
    const invalid = await app.request("/invalid");
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      error: { code: "VALIDATION_ERROR", message: "bio: Too long" },
    });
    expect(lines).toHaveLength(0);
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
});
