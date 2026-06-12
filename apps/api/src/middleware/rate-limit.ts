import type { MiddlewareHandler } from "hono";
import type { Logger } from "pino";
import { getConnInfo } from "hono/bun";

export interface RateLimitConfig {
  requests: number;
  burst: number;
  windowSeconds: number;
}

const STALE_ENTRY_TTL_FACTOR = 10;

interface VisitorEntry {
  tokens: number;
  lastSeen: number;
  lastRefill: number;
}

export function rateLimitConfigFromValues(
  defaultRequests: number,
  defaultBurst: number,
  defaultWindowSeconds: number,
  requests: number,
  burst: number,
  windowSeconds: number,
): RateLimitConfig {
  return {
    requests: requests > 0 ? requests : defaultRequests,
    burst: Math.min(burst > 0 ? burst : defaultBurst, requests > 0 ? requests : defaultRequests),
    windowSeconds: windowSeconds > 0 ? windowSeconds : defaultWindowSeconds,
  };
}

export function createRateLimiter(
  logger: Logger,
  name: string,
  message: string,
  cfg: RateLimitConfig,
  pathPrefix: string,
): MiddlewareHandler {
  if (!logger) {
    throw new Error(`${name} rate limit requires a logger`);
  }
  const limiters = new Map<string, VisitorEntry>();

  const rate = cfg.requests / cfg.windowSeconds;
  const staleWindow = cfg.windowSeconds * STALE_ENTRY_TTL_FACTOR * 1000;

  function getClientIP(c: { req: { header: (name: string) => string | undefined } }): string {
    try {
      const info = getConnInfo(c as Parameters<typeof getConnInfo>[0]);
      return info.remote.address ?? "unknown";
    } catch {
      const forwarded = c.req.header("x-forwarded-for");
      if (forwarded) {
        return forwarded.split(",")[0]!.trim();
      }
      return "unknown";
    }
  }

  return async (c, next) => {
    const ip = getClientIP(c);
    const key = `${c.req.routePath}:${ip}`;
    const now = Date.now();

    let entry = limiters.get(key);

    // Clean stale entries
    for (const [k, v] of limiters) {
      if (now - v.lastSeen > staleWindow) {
        limiters.delete(k);
      }
    }

    if (!entry) {
      entry = {
        tokens: cfg.burst,
        lastSeen: now,
        lastRefill: now,
      };
      limiters.set(key, entry);
    }

    entry.lastSeen = now;

    // Refill tokens
    const elapsed = (now - entry.lastRefill) / 1000;
    entry.tokens = Math.min(cfg.burst, entry.tokens + elapsed * rate);
    entry.lastRefill = now;

    if (entry.tokens < 1) {
      const waitTime = Math.ceil((1 - entry.tokens) / rate);
      const retryAfter = Math.max(1, waitTime);
      c.header("Retry-After", String(retryAfter));
      c.header("X-RateLimit-Limit", `${cfg.requests} requests per ${cfg.windowSeconds}s (burst ${cfg.burst})`);
      logger.warn({ name, path: c.req.routePath, client_ip: ip, retry_after: retryAfter }, `${name} rate limit exceeded`);
      return c.json(
        { error: { code: "RATE_LIMITED", message } },
        429,
      );
    }

    entry.tokens -= 1;
    c.header("X-RateLimit-Limit", `${cfg.requests} requests per ${cfg.windowSeconds}s (burst ${cfg.burst})`);
    return next();
  };
}
