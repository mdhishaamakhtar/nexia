import type { Config } from "../config/config";
import type { Logger } from "../logging/logger";
import type { MiddlewareHandler } from "hono";
import { createRateLimiter, rateLimitConfigFromValues, type RateLimitConfig } from "./rate-limit";

const DEFAULT_CHAT_REQUESTS = 10;
const DEFAULT_CHAT_BURST = 3;
const DEFAULT_CHAT_WINDOW_SECONDS = 60;

function chatRateLimitConfigFromConfig(cfg: Config | null): RateLimitConfig {
  if (!cfg) {
    return rateLimitConfigFromValues(
      DEFAULT_CHAT_REQUESTS,
      DEFAULT_CHAT_BURST,
      DEFAULT_CHAT_WINDOW_SECONDS,
      0, 0, 0,
    );
  }
  return rateLimitConfigFromValues(
    DEFAULT_CHAT_REQUESTS,
    DEFAULT_CHAT_BURST,
    DEFAULT_CHAT_WINDOW_SECONDS,
    cfg.server.chat_rate_limit_requests,
    cfg.server.chat_rate_limit_burst,
    cfg.server.chat_rate_limit_window_seconds,
  );
}

export function createChatRateLimiter(logger: Logger, cfg: Config): MiddlewareHandler {
  const rlCfg = chatRateLimitConfigFromConfig(cfg);
  return createRateLimiter(logger, "chat", "Too many chat requests", rlCfg, "/chat");
}
