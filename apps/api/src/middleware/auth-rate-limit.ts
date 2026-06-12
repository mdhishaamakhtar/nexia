import type { Config } from "../config/config";
import type { Logger } from "pino";
import type { MiddlewareHandler } from "hono";
import { createRateLimiter, rateLimitConfigFromValues, type RateLimitConfig } from "./rate-limit";

const DEFAULT_AUTH_REQUESTS = 10;
const DEFAULT_AUTH_BURST = 10;
const DEFAULT_AUTH_WINDOW_SECONDS = 10;

function authRateLimitConfigFromConfig(cfg: Config | null): RateLimitConfig {
  if (!cfg) {
    return rateLimitConfigFromValues(
      DEFAULT_AUTH_REQUESTS,
      DEFAULT_AUTH_BURST,
      DEFAULT_AUTH_WINDOW_SECONDS,
      0, 0, 0,
    );
  }
  return rateLimitConfigFromValues(
    DEFAULT_AUTH_REQUESTS,
    DEFAULT_AUTH_BURST,
    DEFAULT_AUTH_WINDOW_SECONDS,
    cfg.server.auth_rate_limit_requests,
    cfg.server.auth_rate_limit_burst,
    cfg.server.auth_rate_limit_window_seconds,
  );
}

export function createAuthRateLimiter(logger: Logger, cfg: Config): MiddlewareHandler {
  const rlCfg = authRateLimitConfigFromConfig(cfg);
  return createRateLimiter(logger, "auth", "Too many authentication requests", rlCfg, "/auth");
}
