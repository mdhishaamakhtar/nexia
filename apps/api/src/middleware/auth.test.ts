import { describe, test, expect } from "vitest";
import { Hono } from "hono";
import { generateToken } from "../utils/jwt";
import { authMiddleware, getUserId, type AppEnv } from "../middleware/auth";
import type { Config } from "../config/config";

const testCfg: Config = {
  server: {
    port: 8080,
    mode: "test",
    jwt_secret: "test-secret",
    jwt_expiry_minutes: 30,
    cors_origins: [],
    cookie_domain: "",
    auth_rate_limit_requests: 10,
    auth_rate_limit_window_seconds: 10,
    auth_rate_limit_burst: 10,
    chat_rate_limit_requests: 10,
    chat_rate_limit_window_seconds: 60,
    chat_rate_limit_burst: 3,
  },
  db: {} as Config["db"],
  ai: {} as Config["ai"],
  email: {} as Config["email"],
};

function makeUserLookup(user: { id: number } | null, err?: Error) {
  return {
    findById: async (id: number) => {
      if (err) throw err;
      if (user && user.id === id) return user;
      return null;
    },
  };
}

describe("authMiddleware", () => {
  const existingUser = makeUserLookup({ id: 101 });

  function makeApp(userLookup = existingUser) {
    const app = new Hono<AppEnv>();
    app.use("*", authMiddleware(testCfg, userLookup));
    app.get("/protected", (c) => {
      return c.json({ user_id: c.get("userId") });
    });
    return app;
  }

  test("missing token returns 401", async () => {
    const app = makeApp();
    const res = await app.request("/protected");
    expect(res.status).toBe(401);
  });

  test("invalid header format returns 401", async () => {
    const app = makeApp();
    const res = await app.request("/protected", { headers: { Authorization: "Token xyz" } });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  test("valid Bearer token + user exists returns 200", async () => {
    const token = await generateToken(101, testCfg);
    const app = makeApp();
    const res = await app.request("/protected", { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user_id: number };
    expect(body.user_id).toBe(101);
  });

  test("valid cookie token + user exists returns 200", async () => {
    const token = await generateToken(101, testCfg);
    const app = makeApp();
    const res = await app.request("/protected", { headers: { Cookie: `nexia_token=${token}` } });
    expect(res.status).toBe(200);
  });

  test("invalid JWT returns 401", async () => {
    const app = makeApp();
    const res = await app.request("/protected", { headers: { Authorization: "Bearer bad-token" } });
    expect(res.status).toBe(401);
  });

  test("valid token but user deleted from DB returns 401", async () => {
    const token = await generateToken(101, testCfg);
    const noUser = makeUserLookup(null);
    const app = makeApp(noUser);
    const res = await app.request("/protected", { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.message).toBe("User not found");
  });

  test("propagates a DB lookup failure instead of reporting it as 401", async () => {
    // A failing lookup means the database is unreachable, which is not a
    // statement about the caller's credentials. It must surface as a server
    // error so the recovery middleware logs it and monitoring sees it.
    const token = await generateToken(101, testCfg);
    const errLookup = makeUserLookup(null, new Error("db down"));
    const app = makeApp(errLookup);
    const res = await app.request("/protected", { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(500);
  });
});

describe("getUserId", () => {
  test("extracts user ID from context", async () => {
    const app2 = new Hono();
    app2.get("/id", (c) => {
      const id = getUserId(c);
      return c.json({ user_id: id ?? null });
    });
    const res = await app2.request("/id");
    const body = (await res.json()) as { user_id: unknown };
    expect(body.user_id).toBeNull();
  });
});
