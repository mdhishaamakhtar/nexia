import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import type { Config } from "../config/config";
import { validateToken, type JWTClaims } from "../utils/jwt";
import { respondError } from "../utils/http";
import { AUTH_TOKEN_COOKIE, startSession } from "../utils/session";

export interface AppVariables {
  userId: number;
  authMethod: "bearer" | "cookie";
  requestID: string;
}

export type AppEnv = {
  Variables: AppVariables;
};

export type SessionLookup = {
  findSession(id: number): Promise<{ id: number; passwordChangedAt: Date | null } | null>;
};

/** A token older than the last password change belongs to the old password. */
function issuedBeforePasswordChange(claims: JWTClaims, changedAt: Date | null): boolean {
  if (!changedAt) return false;
  // `iat` has one-second resolution; compare whole seconds so a sign-in in the
  // same second as the reset is not refused.
  return claims.iat < Math.floor(changedAt.getTime() / 1000);
}

/**
 * Authenticates by `Authorization: Bearer` or the `nexia_token` cookie.
 *
 * Cookie sessions slide: once half the lifetime has passed, the response
 * carries a fresh token, so someone using the app is never signed out mid-edit.
 * The configured expiry is therefore an idle timeout.
 */
export function authMiddleware(cfg: Config, sessions: SessionLookup) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const authHeader = c.req.header("Authorization");
    let token: string | undefined;

    if (authHeader) {
      const [scheme, value, ...rest] = authHeader.split(" ");
      if (scheme !== "Bearer" || !value || rest.length > 0) {
        return respondError(c, 401, "UNAUTHORIZED", "Invalid authorization header format");
      }
      token = value;
      c.set("authMethod", "bearer");
    } else {
      token = getCookie(c, AUTH_TOKEN_COOKIE);
      if (!token) return respondError(c, 401, "UNAUTHORIZED", "Authorization token required");
      c.set("authMethod", "cookie");
    }

    let claims: JWTClaims;
    try {
      claims = await validateToken(token, cfg);
    } catch {
      return respondError(c, 401, "UNAUTHORIZED", "Invalid or expired token");
    }

    // Deliberately unguarded: a lookup that *fails* is an outage, not a
    // credential problem, and belongs in the error handler as a logged 500.
    const user = await sessions.findSession(claims.user_id);
    if (!user || issuedBeforePasswordChange(claims, user.passwordChangedAt)) {
      return respondError(c, 401, "UNAUTHORIZED", "Invalid or expired token");
    }

    c.set("userId", claims.user_id);

    // Renew before the handler runs, not after: a handler that ends the session
    // (logout) then clears the cookies after this sets them, and wins.
    const halfLife = (claims.exp - claims.iat) / 2;
    if (c.get("authMethod") === "cookie" && Date.now() / 1000 - claims.iat > halfLife) {
      await startSession(c, claims.user_id, cfg);
    }

    await next();
  });
}
