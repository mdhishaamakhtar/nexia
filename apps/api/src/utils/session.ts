import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { CookieOptions } from "hono/utils/cookie";
import type { Config } from "../config/config";
import { generateCsrfToken } from "./csrf";
import { generateToken } from "./jwt";

export const AUTH_TOKEN_COOKIE = "nexia_token";
export const CSRF_COOKIE_NAME = "nexia_csrf";

/**
 * Secure in release mode, Lax everywhere. The web app and the API share a
 * registrable domain (the CSRF cookie has to be readable by the web app, so
 * they must), which makes their requests same-site: Lax is enough, and it
 * keeps the browser from attaching the session to other sites' requests.
 */
function baseOptions(config: Config): CookieOptions {
  return {
    secure: config.server.mode === "release",
    sameSite: "Lax",
    path: "/",
    domain: config.server.cookie_domain || undefined,
  };
}

/**
 * Issues a session: the httpOnly auth cookie plus the readable CSRF cookie the
 * client echoes in a header. An existing CSRF value is kept, so renewing a
 * session mid-flight never invalidates a request already on its way.
 */
export async function startSession(c: Context, userId: number, config: Config): Promise<string> {
  const token = await generateToken(userId, config);
  const options = { ...baseOptions(config), maxAge: config.server.jwt_expiry_minutes * 60 };

  setCookie(c, AUTH_TOKEN_COOKIE, token, { ...options, httpOnly: true });
  setCookie(c, CSRF_COOKIE_NAME, getCookie(c, CSRF_COOKIE_NAME) ?? generateCsrfToken(), options);
  return token;
}

export function endSession(c: Context, config: Config): void {
  const options = baseOptions(config);
  deleteCookie(c, AUTH_TOKEN_COOKIE, options);
  deleteCookie(c, CSRF_COOKIE_NAME, options);
}
