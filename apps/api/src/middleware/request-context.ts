import type { Context, MiddlewareHandler } from "hono";
import type { Logger } from "pino";

export function requestContext(logger: Logger): MiddlewareHandler {
  return async (c, next) => {
    const requestId = c.req.header("X-Request-ID") ?? crypto.randomUUID();
    c.set("requestID", requestId);
    c.header("X-Request-ID", requestId);

    const start = Date.now();
    await next();

    const status = c.res.status;
    const durationMs = Date.now() - start;

    const fields: Record<string, unknown> = {
      request_id: requestId,
      method: c.req.method,
      path: c.req.routePath,
      raw_path: c.req.path,
      status_code: status,
      duration_ms: durationMs,
      user_agent: c.req.header("User-Agent") ?? "-",
    };

    const userId = c.get("userId");
    if (userId !== undefined) {
      fields.user_id = userId;
    }

    if (status >= 500) {
      logger.error(fields, "request completed");
    } else if (status >= 400) {
      logger.warn(fields, "request completed");
    } else {
      logger.info(fields, "request completed");
    }
  };
}

export function recovery(logger: Logger): MiddlewareHandler {
  return async (c, next) => {
    try {
      await next();
    } catch (err) {
      logger.error(
        {
          request_id: c.get("requestID") ?? "-",
          panic: String(err),
          stack: err instanceof Error ? err.stack : undefined,
          method: c.req.method,
          path: c.req.path,
        },
        "panic recovered",
      );
      return c.json(
        { error: { code: "SERVER_ERROR", message: "Internal server error" } },
        500,
      );
    }
  };
}

export function getRequestID(c: Context): string {
  return (c.get("requestID") as string) ?? "";
}
