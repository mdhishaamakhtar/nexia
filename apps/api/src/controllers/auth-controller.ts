import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { AuthService } from "../services/auth-service";
import type { Config } from "../config/config";
import { generateCsrfToken } from "../utils/csrf";
import { respondWithServiceError } from "../services/errors";
import { CSRF_COOKIE_NAME } from "../middleware/csrf";
import { getUserId, type UserLookup } from "../middleware/auth";

export function createAuthController(authService: AuthService, config: Config) {
  const app = new Hono();

  app.post("/signup", async (c) => {
    const body = await c.req.json();
    const { email, password } = body;
    if (!email || !password) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Email and password required" } }, 400);
    }
    try {
      await authService.signup(email, password);
      return c.json({ message: "Account created. Please check your email to verify your account." }, 201);
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.post("/login", async (c) => {
    const body = await c.req.json();
    const { email, password } = body;
    if (!email || !password) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Email and password required" } }, 400);
    }
    try {
      const token = await authService.login(email, password);

      const maxAge = config.server.jwt_expiry_minutes * 60;
      const domain = config.server.cookie_domain || undefined;

      setCookie(c, "nexia_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "None" as const,
        path: "/",
        domain,
        maxAge,
      });

      const csrfToken = generateCsrfToken();
      setCookie(c, CSRF_COOKIE_NAME, csrfToken, {
        secure: true,
        sameSite: "None" as const,
        path: "/",
        domain,
        maxAge,
      });

      return c.json({ token });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.get("/verify-email", async (c) => {
    const token = c.req.query("token");
    if (!token) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Token is required" } }, 400);
    }
    try {
      await authService.verifyEmail(token);
      return c.json({ message: "Email verified successfully" });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.get("/me", (c) => {
    const userId = getUserId(c);
    if (!userId) {
      return c.json({ authenticated: false, user_id: null as never }, 200);
    }
    return c.json({ authenticated: true, user_id: userId });
  });

  app.post("/logout", (c) => {
    deleteCookie(c, "nexia_token", { path: "/" });
    deleteCookie(c, CSRF_COOKIE_NAME, { path: "/" });
    return c.json({ message: "Logged out successfully" });
  });

  app.post("/forgot-password", async (c) => {
    const body = await c.req.json();
    const { email } = body;
    if (!email) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Email is required" } }, 400);
    }
    try {
      await authService.forgotPassword(email);
      return c.json({ message: "If the email exists, a reset link has been sent" });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.post("/reset-password", async (c) => {
    const body = await c.req.json();
    const { token, new_password } = body;
    if (!token || !new_password) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Token and new password required" } }, 400);
    }
    try {
      await authService.resetPassword(token, new_password);
      return c.json({ message: "Password reset successfully" });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  return app;
}
