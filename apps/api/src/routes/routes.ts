import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Config } from "../config/config";
import type { AuthService } from "../services/auth-service";
import type { ProfileService } from "../services/profile-service";
import type { ChatAgent } from "../ai/agent";
import type { Logger } from "../logging/logger";
import type { DB } from "../db/client";
import type { UserLookup } from "../middleware/auth";
import { requestContext, recovery } from "../middleware/request-context";
import { authMiddleware, type AppEnv } from "../middleware/auth";
import { csrfMiddleware } from "../middleware/csrf";
import { createAuthRateLimiter } from "../middleware/auth-rate-limit";
import { createChatRateLimiter } from "../middleware/chat-rate-limit";
import { createAuthController } from "../controllers/auth-controller";
import { createProfileController } from "../controllers/profile-controller";
import { createChatController } from "../controllers/chat-controller";
import { generateCsrfToken } from "../utils/csrf";
import { CSRF_COOKIE_NAME } from "../middleware/csrf";
import { respondWithServiceError } from "../services/errors";

export function buildApp(deps: {
  config: Config;
  logger: Logger;
  db: DB;
  userLookup: UserLookup;
  authService: AuthService;
  profileService: ProfileService;
  chatAgent: ChatAgent;
}) {
  const { config, logger, db, userLookup, authService, profileService, chatAgent } = deps;

  const app = new Hono();

  app.use("*", cors({
    origin: config.server.cors_origins,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Origin", "Content-Type", "Authorization", "X-CSRF-Token"],
  }));
  app.use("*", requestContext(logger));
  app.use("*", recovery(logger));

  app.get("/api/v1/healthz", (c) => c.json({ status: "ok" }));
  app.get("/api/v1/readyz", async (c) => {
    try {
      await db.execute("SELECT 1");
      return c.json({ status: "ok" });
    } catch {
      return c.json({ status: "unavailable" }, 503);
    }
  });

  // Public auth routes (no auth middleware needed)
  app.post("/api/v1/auth/signup", async (c) => {
    const { email, password } = await c.req.json();
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

  app.post("/api/v1/auth/login", async (c) => {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: { code: "VALIDATION_ERROR", message: "Email and password required" } }, 400);
    }
    try {
      const token = await authService.login(email, password);
      const maxAge = config.server.jwt_expiry_minutes * 60;
      const domain = config.server.cookie_domain || undefined;
      const isSecure = config.server.mode === "release";
      const sameSite = isSecure ? ("None" as const) : ("Lax" as const);

      setCookie(c, "nexia_token", token, {
        httpOnly: true, secure: isSecure, sameSite, path: "/", domain, maxAge,
      });
      const csrfToken = generateCsrfToken();
      setCookie(c, CSRF_COOKIE_NAME, csrfToken, {
        secure: isSecure, sameSite, path: "/", domain, maxAge,
      });
      return c.json({ token });
    } catch (err) {
      return respondWithServiceError(c, err);
    }
  });

  app.get("/api/v1/auth/verify-email", async (c) => {
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

  app.post("/api/v1/auth/forgot-password", async (c) => {
    const { email } = await c.req.json();
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

  app.post("/api/v1/auth/reset-password", async (c) => {
    const { token, new_password } = await c.req.json();
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

  // Protected routes (require auth)
  const protectedApp = new Hono<AppEnv>();
  protectedApp.use("*", authMiddleware(config, userLookup));
  protectedApp.use("*", csrfMiddleware());

  // Me
  protectedApp.get("/auth/me", (c) => {
    const userId = c.get("userId");
    if (!userId) {
      return c.json({ authenticated: false, user_id: null }, 200);
    }
    return c.json({ authenticated: true, user_id: userId });
  });

  // Logout
  protectedApp.post("/auth/logout", (c) => {
    deleteCookie(c, "nexia_token", { path: "/" });
    deleteCookie(c, CSRF_COOKIE_NAME, { path: "/" });
    return c.json({ message: "Logged out successfully" });
  });

  // Chat with rate limit
  const chatGroup = new Hono();
  chatGroup.use("*", createChatRateLimiter(logger, config));
  chatGroup.route("/", createChatController(chatAgent));
  protectedApp.route("/chat", chatGroup);

  // Profiles
  protectedApp.route("/profiles", createProfileController(profileService));

  app.route("/api/v1", protectedApp);

  return app;
}
