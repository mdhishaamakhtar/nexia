import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import type { Config } from "../config/config";
import type { AuthService } from "../services/auth-service";
import type { ProfileService } from "../services/profile-service";
import type { ChatAgent } from "../ai/agent";
import type { Logger } from "../logging/logger";
import type { DB } from "../db/client";
import { requestContext, errorHandler } from "../middleware/request-context";
import { authMiddleware, type AppEnv, type SessionLookup } from "../middleware/auth";
import { csrfMiddleware } from "../middleware/csrf";
import { clientAddress, createRateLimiter } from "../middleware/rate-limit";
import { createAuthController, createSessionController } from "../controllers/auth-controller";
import { createProfileController } from "../controllers/profile-controller";
import { createChatController } from "../controllers/chat-controller";
import { respondError } from "../utils/http";

interface BuildDeps {
  config: Config;
  logger: Logger;
  db: DB;
  sessions: SessionLookup;
  authService: AuthService;
  profileService: ProfileService;
  chatAgent: ChatAgent;
}

const KB = 1024;

/** A JSON 413 in the same envelope as every other error. */
function limitBody(maxSize: number) {
  return bodyLimit({
    maxSize,
    onError: (c) => respondError(c, 413, "PAYLOAD_TOO_LARGE", "That request is too large"),
  });
}

export function buildApp(deps: BuildDeps) {
  const { config, logger, db, sessions, authService, profileService, chatAgent } = deps;
  const { server } = config;

  const app = new Hono<AppEnv>();

  app.use(
    "*",
    cors({
      origin: server.cors_origins,
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Origin", "Content-Type", "Authorization", "X-CSRF-Token"],
      // Lets the browser reuse a preflight for ten minutes instead of asking
      // again before nearly every write.
      maxAge: 600,
    })
  );
  app.use("*", compress());
  app.use("*", requestContext(logger));
  app.onError(errorHandler(logger));

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

  // Public auth routes. The limiter counts per client address; behind a proxy
  // that address comes from the header the proxy sets.
  const authLimit = createRateLimiter({
    name: "auth",
    message: "Too many attempts. Wait a few seconds and try again.",
    requests: server.auth_rate_limit_requests,
    windowSeconds: server.auth_rate_limit_window_seconds,
    burst: server.auth_rate_limit_burst,
    key: (c) => clientAddress(c, server.client_ip_header),
    logger,
  });
  app.use("/api/v1/auth/*", limitBody(16 * KB));
  app.route("/api/v1/auth", createAuthController(authService, config, authLimit));

  // Everything below needs a signed-in user.
  const protectedApp = new Hono<AppEnv>();
  protectedApp.use("*", authMiddleware(config, sessions));
  protectedApp.use("*", csrfMiddleware());

  protectedApp.route("/auth", createSessionController(config));

  // Chat is limited per user: the route is authenticated, so the address adds
  // nothing but the risk of sharing a budget behind one NAT.
  const chat = new Hono<AppEnv>();
  chat.use("*", limitBody(1024 * KB));
  chat.use(
    "*",
    createRateLimiter({
      name: "chat",
      message: "You're sending messages quickly. Give it a few seconds.",
      requests: server.chat_rate_limit_requests,
      windowSeconds: server.chat_rate_limit_window_seconds,
      burst: server.chat_rate_limit_burst,
      key: (c) => `user:${c.get("userId")}`,
      logger,
    })
  );
  chat.route("/", createChatController(chatAgent));
  protectedApp.route("/chat", chat);

  const profiles = new Hono<AppEnv>();
  profiles.use("*", limitBody(256 * KB));
  profiles.route("/", createProfileController(profileService));
  protectedApp.route("/profiles", profiles);

  app.route("/api/v1", protectedApp);

  return app;
}
