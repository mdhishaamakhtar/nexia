import { Hono } from "hono";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
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
import { createSessionController } from "../controllers/auth-controller";
import { createProfileController } from "../controllers/profile-controller";
import { createChatController } from "../controllers/chat-controller";

interface BuildDeps {
  config: Config;
  logger: Logger;
  db: DB;
  userLookup: UserLookup;
  authService: AuthService;
  profileService: ProfileService;
  chatAgent: ChatAgent;
}

export function buildApp(deps: BuildDeps) {
  const { config, logger, db, userLookup, authService, profileService, chatAgent } = deps;

  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: config.server.cors_origins,
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Origin", "Content-Type", "Authorization", "X-CSRF-Token"],
    })
  );
  app.use("*", compress());
  app.use("*", requestContext(logger));
  app.use("*", recovery(logger));

  // Health probes
  app.get("/api/v1/healthz", (c) => c.json({ status: "ok" }));
  app.get("/api/v1/readyz", async (c) => {
    try {
      await db.execute("SELECT 1");
      return c.json({ status: "ok" });
    } catch {
      return c.json({ status: "unavailable" }, 503);
    }
  });

  // Public auth routes (rate-limited per IP)
  const authGroup = new Hono();
  authGroup.use("*", createAuthRateLimiter(logger, config));
  authGroup.route("/", createAuthController(authService, config));
  app.route("/api/v1/auth", authGroup);

  // Protected routes (auth + CSRF)
  const protectedApp = new Hono<AppEnv>();
  protectedApp.use("*", authMiddleware(config, userLookup));
  protectedApp.use("*", csrfMiddleware());

  protectedApp.route("/auth", createSessionController(config));

  // Chat (auth + CSRF + chat rate limit)
  const chatGroup = new Hono();
  chatGroup.use("*", createChatRateLimiter(logger, config));
  chatGroup.route("/", createChatController(chatAgent));
  protectedApp.route("/chat", chatGroup);

  // Profiles CRUD
  protectedApp.route("/profiles", createProfileController(profileService));

  app.route("/api/v1", protectedApp);

  return app;
}
