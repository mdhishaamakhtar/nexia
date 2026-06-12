import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { timingSafeEqual } from "node:crypto";
import type { AppEnv } from "./auth";

export const CSRF_COOKIE_NAME = "nexia_csrf";
export const CSRF_HEADER_NAME = "X-CSRF-Token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function csrfMiddleware() {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (SAFE_METHODS.has(c.req.method)) {
      return next();
    }

    const authMethod = c.get("authMethod");
    if (authMethod !== "cookie") {
      return next();
    }

    const cookieToken = getCookie(c, CSRF_COOKIE_NAME);
    if (!cookieToken) {
      return c.json(
        { error: { code: "CSRF_TOKEN_MISSING", message: "CSRF token required" } },
        403,
      );
    }

    const headerToken = c.req.header(CSRF_HEADER_NAME);
    if (!headerToken) {
      return c.json(
        { error: { code: "CSRF_TOKEN_MISSING", message: "CSRF token required" } },
        403,
      );
    }

    const cookieBuf = Buffer.from(cookieToken);
    const headerBuf = Buffer.from(headerToken);

    if (cookieBuf.length !== headerBuf.length || !timingSafeEqual(cookieBuf, headerBuf)) {
      return c.json(
        { error: { code: "CSRF_TOKEN_INVALID", message: "Invalid CSRF token" } },
        403,
      );
    }

    return next();
  });
}
