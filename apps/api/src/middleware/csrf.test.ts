import { describe, test, expect } from "bun:test";
import { Hono } from "hono";
import { csrfMiddleware, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../middleware/csrf";
import type { AppEnv } from "../middleware/auth";

describe("csrfMiddleware", () => {
  function makeApp() {
    const app = new Hono<AppEnv>();
    app.use("*", (c, next) => {
      const authHeader = c.req.header("Authorization");
      if (authHeader) {
        c.set("authMethod", "bearer");
      } else if (c.req.header("Cookie")?.includes("nexia_token")) {
        c.set("authMethod", "cookie");
      }
      return next();
    });
    app.use("*", csrfMiddleware());
    app.post("/protected", (c) => c.json({ ok: true }));
    app.get("/protected", (c) => c.json({ ok: true }));
    return app;
  }

  test("safe method bypasses CSRF", async () => {
    const app = makeApp();
    const res = await app.request("/protected", { headers: { Cookie: "nexia_token=abc" } });
    expect(res.status).toBe(200);
  });

  test("bearer auth bypasses CSRF on POST", async () => {
    const app = makeApp();
    const res = await app.request("/protected", { method: "POST", headers: { Authorization: "Bearer token" } });
    expect(res.status).toBe(200);
  });

  test("missing CSRF cookie returns 403", async () => {
    const app = makeApp();
    const res = await app.request("/protected", { method: "POST", headers: { Cookie: "nexia_token=abc" } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("CSRF_TOKEN_MISSING");
  });

  test("mismatched CSRF header returns 403", async () => {
    const app = makeApp();
    const res = await app.request("/protected", {
      method: "POST",
      headers: {
        Cookie: `nexia_token=abc; ${CSRF_COOKIE_NAME}=cookie-token`,
        [CSRF_HEADER_NAME]: "header-token",
      },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("CSRF_TOKEN_INVALID");
  });

  test("matching CSRF token succeeds", async () => {
    const app = makeApp();
    const res = await app.request("/protected", {
      method: "POST",
      headers: {
        Cookie: `nexia_token=abc; ${CSRF_COOKIE_NAME}=same-token`,
        [CSRF_HEADER_NAME]: "same-token",
      },
    });
    expect(res.status).toBe(200);
  });
});
