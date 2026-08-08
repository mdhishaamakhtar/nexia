import { describe, test, expect } from "vitest";
import { generateToken, validateToken } from "../utils/jwt";
import type { Config } from "../config/config";

const testCfg: Config = {
  server: {
    port: 8080,
    mode: "test",
    jwt_secret: "test-secret",
    jwt_expiry_minutes: 1,
    cors_origins: [],
    cookie_domain: "",
    auth_rate_limit_requests: 10,
    auth_rate_limit_window_seconds: 10,
    auth_rate_limit_burst: 10,
    chat_rate_limit_requests: 10,
    chat_rate_limit_window_seconds: 60,
    chat_rate_limit_burst: 3,
  },
  db: {
    host: "",
    port: 5432,
    user: "",
    password: "",
    name: "",
    ssl_mode: "disable",
    run_migrations: false,
    idle_timeout_seconds: 300,
    max_open_conns: 50,
    conn_max_lifetime_minutes: 60,
  },
  ai: {
    gemini_api_key: "",
    redis_url: "",
    opencode_api_key: "",
    opencode_base_url: "",
    chat_model: "",
  },
  email: {
    resend_api_key: "",
    from_address: "",
    app_base_url: "",
  },
};

describe("jwt", () => {
  test("generate and validate round trip", async () => {
    const token = await generateToken(123, testCfg);
    const claims = await validateToken(token, testCfg);
    expect(claims.user_id).toBe(123);
  });

  test("wrong secret rejects token", async () => {
    const token = await generateToken(123, testCfg);
    const wrongCfg = { ...testCfg, server: { ...testCfg.server, jwt_secret: "wrong" } };
    await expect(validateToken(token, wrongCfg)).rejects.toThrow();
  });

  test("malformed token rejected", async () => {
    await expect(validateToken("not-a-token", testCfg)).rejects.toThrow();
  });

  test("default expiry when expiry is 0", async () => {
    const cfg = { ...testCfg, server: { ...testCfg.server, jwt_expiry_minutes: 0 } };
    const token = await generateToken(321, cfg);
    const claims = await validateToken(token, cfg);
    // Should have ~24h expiry
    const lifetime = claims.exp - claims.iat;
    expect(lifetime).toBeGreaterThanOrEqual(23 * 3600);
  });
});
