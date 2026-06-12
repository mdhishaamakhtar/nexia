import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Config } from "../config/config";
import type { AuthService } from "../services/auth-service";
import type { ProfileService } from "../services/profile-service";
import type { ChatAgent } from "../ai/agent";
import type { Logger } from "../logging/logger";
import type { DB } from "../db/client";
import type { UserLookup } from "../middleware/auth";
import { requestContext, recovery } from "../middleware/request-context";
import { authMiddleware } from "../middleware/auth";
import { csrfMiddleware } from "../middleware/csrf";
import { createAuthRateLimiter } from "../middleware/auth-rate-limit";
import { createChatRateLimiter } from "../middleware/chat-rate-limit";
import { createAuthController } from "../controllers/auth-controller";
import { createProfileController } from "../controllers/profile-controller";
import { createChatController } from "../controllers/chat-controller";

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

  // Public auth routes
  app.route("/api/v1/auth", createAuthController(authService, config));

  // Protected routes
  const protectedApp = new Hono();
  protectedApp.use("*", authMiddleware(config, userLookup));
  protectedApp.use("*", csrfMiddleware());

  // Chat with rate limit
  const chatGroup = new Hono();
  chatGroup.use("*", createChatRateLimiter(logger, config));
  chatGroup.route("/", createChatController(chatAgent));
  protectedApp.route("/chat", chatGroup);

  // Profiles
  protectedApp.route("/profiles", createProfileController(profileService));

  // Auth session (me/logout) under protected
  protectedApp.route("/auth", createAuthController(authService, config));

  app.route("/api/v1", protectedApp);

  return app;
}

