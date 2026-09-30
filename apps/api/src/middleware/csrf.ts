import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { timingSafeEqual } from "node:crypto";
import type { AppEnv } from "./auth";
import { CSRF_COOKIE_NAME } from "../utils/session";
import { respondError } from "../utils/http";

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
      return respondError(c, 403, "CSRF_TOKEN_MISSING", "CSRF token required");
    }

    const headerToken = c.req.header(CSRF_HEADER_NAME);
    if (!headerToken) {
      return respondError(c, 403, "CSRF_TOKEN_MISSING", "CSRF token required");
    }

    const cookieBuf = Buffer.from(cookieToken);
    const headerBuf = Buffer.from(headerToken);

    if (cookieBuf.length !== headerBuf.length || !timingSafeEqual(cookieBuf, headerBuf)) {
      return respondError(c, 403, "CSRF_TOKEN_INVALID", "Invalid CSRF token");
    }

    return next();
  });
}
