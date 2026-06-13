import { Hono, type Context } from "hono";
import { setCookie } from "hono/cookie";
import type { CookieOptions } from "hono/utils/cookie";
import {
  signupRequestSchema,
  loginRequestSchema,
  forgotPasswordRequestSchema,
  resetPasswordRequestSchema,
} from "@nexia/shared";
import type { AuthService } from "../services/auth-service";
import type { Config } from "../config/config";
import { generateCsrfToken } from "../utils/csrf";
import { respondWithServiceError, respondError } from "../services/errors";
import { CSRF_COOKIE_NAME } from "../middleware/csrf";
import { parseJsonBody } from "../utils/validation";

export const AUTH_TOKEN_COOKIE = "nexia_token";

/** Public authentication routes. Session routes (/me, /logout) live in routes.ts. */
export function createAuthController(authService: AuthService, config: Config) {
  const app = new Hono();

  app.post("/signup", async (c) => {
    const parsed = await parseJsonBody(c, signupRequestSchema);
    if (!parsed.ok) return parsed.response;
    try {
      await authService.signup(parsed.data.email, parsed.data.password);
      return c.json(
        { message: "Account created. Please check your email to verify your account." },
        201
      );
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.post("/login", async (c) => {
    const parsed = await parseJsonBody(c, loginRequestSchema);
    if (!parsed.ok) return parsed.response;
    try {
      const token = await authService.login(parsed.data.email, parsed.data.password);
      setAuthCookies(c, token, config);
      return c.json({ token });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.get("/verify-email", async (c) => {
    const token = c.req.query("token");
    if (!token) {
      return respondError(c, 400, "VALIDATION_ERROR", "Token is required");
    }
    try {
      await authService.verifyEmail(token);
      return c.json({ message: "Email verified successfully" });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.post("/forgot-password", async (c) => {
    const parsed = await parseJsonBody(c, forgotPasswordRequestSchema);
    if (!parsed.ok) return parsed.response;
    try {
      await authService.forgotPassword(parsed.data.email);
      return c.json({ message: "If the email exists, a reset link has been sent" });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.post("/reset-password", async (c) => {
    const parsed = await parseJsonBody(c, resetPasswordRequestSchema);
    if (!parsed.ok) return parsed.response;
    try {
      await authService.resetPassword(parsed.data.token, parsed.data.new_password);
      return c.json({ message: "Password reset successfully" });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  return app;
}

/**
 * Sets the auth (httpOnly) and CSRF (readable) cookies. In release mode they are
 * Secure + SameSite=None for cross-subdomain auth; locally they stay Lax so they
 * work over plain HTTP.
 */
function setAuthCookies(c: Context, token: string, config: Config): void {
  const isSecure = config.server.mode === "release";
  const base: CookieOptions = {
    secure: isSecure,
    sameSite: isSecure ? "None" : "Lax",
    path: "/",
    domain: config.server.cookie_domain || undefined,
    maxAge: config.server.jwt_expiry_minutes * 60,
  };

  setCookie(c, AUTH_TOKEN_COOKIE, token, { ...base, httpOnly: true });
  setCookie(c, CSRF_COOKIE_NAME, generateCsrfToken(), base);
}
