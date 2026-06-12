import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import type { Config } from "../config/config";
import { validateToken } from "../utils/jwt";

export const AUTH_METHOD_KEY = "authMethod";
export const USER_ID_KEY = "userId";

export type UserLookup = {
  findById(id: number): Promise<{ id: number } | null>;
};

export function authMiddleware(cfg: Config, userLookup: UserLookup): MiddlewareHandler {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    let tokenString: string;

    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer") {
        return c.json(
          { error: { code: "UNAUTHORIZED", message: "Invalid authorization header format" } },
          401,
        );
      }
      tokenString = parts[1]!;
      c.set(AUTH_METHOD_KEY, "bearer");
    } else {
      const cookieToken = getCookie(c, "nexia_token");
      if (!cookieToken) {
        return c.json(
          { error: { code: "UNAUTHORIZED", message: "Authorization token required" } },
          401,
        );
      }
      tokenString = cookieToken;
      c.set(AUTH_METHOD_KEY, "cookie");
    }

    let claims;
    try {
      claims = await validateToken(tokenString, cfg);
    } catch {
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } },
        401,
      );
    }

    let user;
    try {
      user = await userLookup.findById(claims.user_id);
    } catch {
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "User not found" } },
        401,
      );
    }
    if (!user) {
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "User not found" } },
        401,
      );
    }

    c.set(USER_ID_KEY, claims.user_id);
    await next();
  };
}

export function getUserId(c: Context): number | undefined {
  return c.get(USER_ID_KEY) as number | undefined;
}
