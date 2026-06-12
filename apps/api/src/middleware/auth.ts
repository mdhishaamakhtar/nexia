import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import type { Config } from "../config/config";
import { validateToken } from "../utils/jwt";

// Context variable type declarations
export interface AppVariables {
  userId: number;
  authMethod: "bearer" | "cookie";
}

export type AppEnv = {
  Variables: AppVariables;
};

export type UserLookup = {
  findById(id: number): Promise<{ id: number } | null>;
};

export function authMiddleware(cfg: Config, userLookup: UserLookup) {
  return createMiddleware<AppEnv>(async (c, next) => {
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
      c.set("authMethod", "bearer");
    } else {
      const cookieToken = getCookie(c, "nexia_token");
      if (!cookieToken) {
        return c.json(
          { error: { code: "UNAUTHORIZED", message: "Authorization token required" } },
          401,
        );
      }
      tokenString = cookieToken;
      c.set("authMethod", "cookie");
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

    c.set("userId", claims.user_id);
    await next();
  });
}

export function getUserId(c: { get: (key: string) => unknown }): number | undefined {
  const v = c.get("userId");
  return typeof v === "number" ? v : undefined;
}
