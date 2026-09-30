import type { Context, MiddlewareHandler } from "hono";
import { getConnInfo } from "@hono/node-server/conninfo";
import type { ErrorCode } from "@nexia/shared";
import type { Logger } from "../logging/logger";
import { respondError } from "../utils/http";

export interface RateLimitOptions {
  name: string;
  /** Shown to the client with the 429. */
  message: string;
  requests: number;
  windowSeconds: number;
  burst: number;
  /** Who a request counts against: an address, a user id. */
  key: (c: Context) => string;
  logger: Logger;
  /** Injectable clock, for tests. */
  now?: () => number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const RATE_LIMITED: ErrorCode = "RATE_LIMITED";

/**
 * The address a request came from. Behind a reverse proxy the socket address
 * is the proxy's own, so every caller would share one bucket; `header` names
 * the header the proxy writes the real address into. Only a header the proxy
 * overwrites can be trusted — a client can send any header it likes.
 */
export function clientAddress(c: Context, header: string): string {
  if (header) {
    const value = c.req.header(header)?.split(",")[0]?.trim();
    if (value) return value;
  }
  try {
    return getConnInfo(c).remote.address ?? "unknown";
  } catch {
    // No socket: an in-process request (tests) or an adapter without one.
    return "unknown";
  }
}

/**
 * A token bucket per key: `burst` requests at once, refilled at `requests` per
 * `windowSeconds`. In memory, so limits are per process, not per deployment.
 */
export function createRateLimiter(opts: RateLimitOptions): MiddlewareHandler {
  const { name, message, requests, windowSeconds, key, logger, now = Date.now } = opts;
  const burst = Math.min(opts.burst, requests);
  const ratePerMs = requests / (windowSeconds * 1000);
  const windowMs = windowSeconds * 1000;
  const buckets = new Map<string, Bucket>();
  let lastSweep = now();

  function sweep(at: number): void {
    // A bucket that has had a full window to refill is indistinguishable from a
    // fresh one, so it can go. Sweeping once per window keeps this O(1) per request.
    if (at - lastSweep < windowMs) return;
    lastSweep = at;
    for (const [k, bucket] of buckets) {
      if (at - bucket.lastRefill >= windowMs) buckets.delete(k);
    }
  }

  return async (c, next) => {
    const at = now();
    sweep(at);

    const id = key(c);
    const bucket = buckets.get(id) ?? { tokens: burst, lastRefill: at };
    bucket.tokens = Math.min(burst, bucket.tokens + (at - bucket.lastRefill) * ratePerMs);
    bucket.lastRefill = at;
    buckets.set(id, bucket);

    if (bucket.tokens < 1) {
      const retryAfter = Math.max(1, Math.ceil((1 - bucket.tokens) / ratePerMs / 1000));
      c.header("Retry-After", String(retryAfter));
      logger.warn({ limiter: name, key: id, retry_after: retryAfter }, "rate limit exceeded");
      return respondError(c, 429, RATE_LIMITED, message);
    }

    bucket.tokens -= 1;
    return next();
  };
}
