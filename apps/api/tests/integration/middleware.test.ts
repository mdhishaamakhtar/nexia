import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { SignJWT } from "jose";
import { createHarness, type Harness } from "../helpers/harness";
import {
  bearerAuth,
  call,
  errorCode,
  loginSession,
  profileInput,
  seedUser,
  TEST_PASSWORD,
} from "../helpers/factories";

let h: Harness;

beforeAll(() => {
  h = createHarness();
});
afterAll(async () => {
  await h.close();
});

describe("request context", () => {
  test("echoes a caller-supplied request id", async () => {
    const res = await call(h.app, "GET", "/api/v1/healthz", {
      headers: { "X-Request-ID": "abc-123" },
    });
    expect(res.headers.get("X-Request-ID")).toBe("abc-123");
  });

  test("generates a request id when none is supplied", async () => {
    const res = await call(h.app, "GET", "/api/v1/healthz");
    expect(res.headers.get("X-Request-ID")).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("keeps the request id on error responses", async () => {
    // Error responses are the ones you actually need to correlate in logs, so
    // losing the id there defeats the point of having it.
    const res = await call(h.app, "GET", "/api/v1/profiles/999999", {
      headers: { "X-Request-ID": "trace-me", ...(await bearerAuth(h, (await seedUser(h)).id)) },
    });
    expect(res.status).toBe(404);
    expect(res.headers.get("X-Request-ID")).toBe("trace-me");
  });

  test("keeps the request id on validation errors", async () => {
    const res = await call(h.app, "POST", "/api/v1/auth/signup", {
      headers: { "X-Request-ID": "bad-input" },
      body: { email: "nope", password: "x" },
    });
    expect(res.status).toBe(400);
    expect(res.headers.get("X-Request-ID")).toBe("bad-input");
  });
});

describe("CORS", () => {
  test("allows the configured origin with credentials", async () => {
    const res = await call(h.app, "GET", "/api/v1/healthz", {
      headers: { Origin: "http://localhost:3000" },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:3000");
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  test("does not echo an unlisted origin", async () => {
    const res = await call(h.app, "GET", "/api/v1/healthz", {
      headers: { Origin: "https://evil.example" },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).not.toBe("https://evil.example");
  });
});

describe("authentication", () => {
  test("rejects a request with no credentials", async () => {
    const res = await call(h.app, "GET", "/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(errorCode(res)).toBe("UNAUTHORIZED");
  });

  test("rejects a malformed Authorization header", async () => {
    const res = await call(h.app, "GET", "/api/v1/auth/me", {
      headers: { Authorization: "Token abc" },
    });
    expect(res.status).toBe(401);
  });

  test("rejects a bearer header with no token part", async () => {
    const res = await call(h.app, "GET", "/api/v1/auth/me", {
      headers: { Authorization: "Bearer" },
    });
    expect(res.status).toBe(401);
  });

  test("rejects a token signed with a different secret", async () => {
    const user = await seedUser(h);
    const forged = await new SignJWT({ user_id: user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("not-the-real-secret"));

    const res = await call(h.app, "GET", "/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${forged}` },
    });
    expect(res.status).toBe(401);
  });

  test("rejects an expired token", async () => {
    const user = await seedUser(h);
    const past = Math.floor(Date.now() / 1000) - 7200;
    const expired = await new SignJWT({ user_id: user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(past)
      .setExpirationTime(past + 60)
      .sign(new TextEncoder().encode(h.config.server.jwt_secret));

    const res = await call(h.app, "GET", "/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${expired}` },
    });
    expect(res.status).toBe(401);
  });

  test("rejects a token whose payload does not match the claims schema", async () => {
    const bad = await new SignJWT({ user_id: "not-a-number" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(h.config.server.jwt_secret));

    const res = await call(h.app, "GET", "/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${bad}` },
    });
    expect(res.status).toBe(401);
  });

  test("rejects a garbage cookie token", async () => {
    const res = await call(h.app, "GET", "/api/v1/auth/me", {
      headers: { Cookie: "nexia_token=garbage" },
    });
    expect(res.status).toBe(401);
  });
});

describe("CSRF", () => {
  test("blocks a cookie-authenticated write with no CSRF header", async () => {
    const user = await seedUser(h, { email: "csrf1@example.com" });
    const session = await loginSession(h, user.email, TEST_PASSWORD);

    const res = await call(h.app, "POST", "/api/v1/profiles", {
      headers: { Cookie: session.cookie },
      body: profileInput(),
    });
    expect(res.status).toBe(403);
    expect(errorCode(res)).toBe("CSRF_TOKEN_MISSING");
  });

  test("blocks a cookie-authenticated write with a mismatched CSRF token", async () => {
    const user = await seedUser(h, { email: "csrf2@example.com" });
    const session = await loginSession(h, user.email, TEST_PASSWORD);

    const res = await call(h.app, "POST", "/api/v1/profiles", {
      headers: { Cookie: session.cookie, "X-CSRF-Token": "a".repeat(64) },
      body: profileInput(),
    });
    expect(res.status).toBe(403);
    expect(errorCode(res)).toBe("CSRF_TOKEN_INVALID");
  });

  test("allows a cookie-authenticated write with the matching token", async () => {
    const user = await seedUser(h, { email: "csrf3@example.com" });
    const session = await loginSession(h, user.email, TEST_PASSWORD);

    const res = await call(h.app, "POST", "/api/v1/profiles", {
      headers: { Cookie: session.cookie, "X-CSRF-Token": session.csrfToken },
      body: profileInput(),
    });
    expect(res.status).toBe(201);
  });

  test("allows a cookie-authenticated read without any CSRF token", async () => {
    const user = await seedUser(h, { email: "csrf4@example.com" });
    const session = await loginSession(h, user.email, TEST_PASSWORD);

    const res = await call(h.app, "GET", "/api/v1/profiles", {
      headers: { Cookie: session.cookie },
    });
    expect(res.status).toBe(200);
  });

  test("does not require CSRF for bearer-authenticated writes", async () => {
    const user = await seedUser(h, { email: "csrf5@example.com" });
    const res = await call(h.app, "POST", "/api/v1/profiles", {
      headers: await bearerAuth(h, user.id),
      body: profileInput(),
    });
    expect(res.status).toBe(201);
  });
});

describe("rate limiting", () => {
  test("returns 429 with retry hints once the burst is spent", async () => {
    const limited = createHarness({
      config: {
        server: {
          auth_rate_limit_requests: 2,
          auth_rate_limit_burst: 2,
          auth_rate_limit_window_seconds: 60,
        },
      },
    });

    try {
      const attempt = () =>
        call(limited.app, "POST", "/api/v1/auth/login", {
          body: { email: "nobody@example.com", password: TEST_PASSWORD },
        });

      expect((await attempt()).status).toBe(401);
      expect((await attempt()).status).toBe(401);

      const throttled = await attempt();
      expect(throttled.status).toBe(429);
      expect(errorCode(throttled)).toBe("RATE_LIMITED");
      expect(throttled.headers.get("Retry-After")).toBeTruthy();
      expect(throttled.headers.get("X-RateLimit-Limit")).toContain("2 requests per 60s");
    } finally {
      await limited.close();
    }
  });

  test("does not throttle unrelated route families", async () => {
    const limited = createHarness({
      config: {
        server: {
          auth_rate_limit_requests: 1,
          auth_rate_limit_burst: 1,
          auth_rate_limit_window_seconds: 60,
        },
      },
    });

    try {
      await call(limited.app, "POST", "/api/v1/auth/login", {
        body: { email: "a@example.com", password: TEST_PASSWORD },
      });
      await call(limited.app, "POST", "/api/v1/auth/login", {
        body: { email: "a@example.com", password: TEST_PASSWORD },
      });

      // Health is outside the auth family and must stay reachable.
      expect((await call(limited.app, "GET", "/api/v1/healthz")).status).toBe(200);
    } finally {
      await limited.close();
    }
  });
});

describe("database failure handling", () => {
  test("reports a database outage as a server error, not as bad credentials", async () => {
    // Port 1 is reserved and refuses immediately.
    const broken = createHarness({ config: { db: { port: 1 } } });

    try {
      const user = await seedUser(h);
      // A valid token: the only thing that can fail here is the user lookup.
      const res = await call(broken.app, "GET", "/api/v1/auth/me", {
        headers: await bearerAuth(h, user.id),
      });

      // 401 would tell the client to re-authenticate over an outage they
      // cannot fix, and would hide the incident from error dashboards.
      expect(res.status).toBeGreaterThanOrEqual(500);
    } finally {
      await broken.close();
    }
  });
});
