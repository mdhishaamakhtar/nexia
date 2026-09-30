import type { ErrorHandler, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Logger } from "../logging/logger";
import { ERROR_RESPONSES, isServiceError } from "../services/errors";
import { respondError } from "../utils/http";

/** A caller-supplied request id is echoed only if it looks like one. */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export function requestContext(logger: Logger): MiddlewareHandler {
  return async (c, next) => {
    const supplied = c.req.header("X-Request-ID");
    const requestId =
      supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : crypto.randomUUID();
    c.set("requestID", requestId);
    c.header("X-Request-ID", requestId);

    const start = Date.now();
    await next();

    const status = c.res.status;
    const fields: Record<string, unknown> = {
      request_id: requestId,
      method: c.req.method,
      path: c.req.routePath,
      raw_path: c.req.path,
      status_code: status,
      duration_ms: Date.now() - start,
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

/**
 * The one place a thrown error becomes a response. Registered with
 * `app.onError`, not as middleware: Hono's dispatcher catches a throwing
 * handler itself and routes it straight here, so a `try { await next() }`
 * middleware never sees it.
 *
 * Expected failures (ServiceError) map to their documented status and code.
 * Anything else is a bug: its stack goes to the log and the client gets a
 * generic message, never the internal one — a database error's message is
 * the failed SQL and its parameters.
 */
export function errorHandler(logger: Logger): ErrorHandler {
  return (err, c) => {
    if (isServiceError(err)) {
      const { status, code, message } = ERROR_RESPONSES[err.kind];
      if (status >= 500) {
        logger.warn(
          { request_id: c.get("requestID"), kind: err.kind, detail: err.message },
          "service unavailable"
        );
      }
      return respondError(c, status, code, message ?? err.message);
    }

    if (err instanceof HTTPException && err.status < 500) {
      return err.getResponse();
    }

    logger.error(
      { request_id: c.get("requestID") ?? "-", err, method: c.req.method, path: c.req.path },
      "unhandled error"
    );
    return respondError(c, 500, "SERVER_ERROR", "Something went wrong on our side");
  };
}
