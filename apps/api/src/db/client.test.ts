import { describe, test, expect, afterEach } from "vitest";
import { createDb } from "./client";
import { configSchema, type Config } from "../config/config";

function cfg(db: Record<string, unknown>): Config {
  return configSchema.parse({
    server: { jwt_secret: "s" },
    db: { host: "localhost", user: "u", password: "p", name: "n", ...db },
    ai: {},
    email: {},
  });
}

const open: Array<{ end: () => Promise<void> }> = [];
afterEach(async () => {
  // postgres.js connects lazily, so nothing above ever opened a socket.
  await Promise.allSettled(open.splice(0).map((sql) => sql.end()));
});

describe("createDb", () => {
  test("builds a drizzle handle and the underlying client", () => {
    const { db, sql } = createDb(cfg({}));
    open.push(sql);

    expect(db).toBeDefined();
    expect(typeof sql).toBe("function");
  });

  test("leaves TLS off when ssl_mode is disable", () => {
    const { sql } = createDb(cfg({ ssl_mode: "disable" }));
    open.push(sql);
    expect(sql.options.ssl).toBeUndefined();
  });

  test("enables TLS when ssl_mode is require", () => {
    const { sql } = createDb(cfg({ ssl_mode: "require" }));
    open.push(sql);
    expect(sql.options.ssl).toBe(true);
  });

  test("applies the configured pool size", () => {
    const { sql } = createDb(cfg({ max_open_conns: 17 }));
    open.push(sql);
    expect(sql.options.max).toBe(17);
  });

  test("treats conn_max_lifetime_minutes as minutes", () => {
    const { sql } = createDb(cfg({ conn_max_lifetime_minutes: 30 }));
    open.push(sql);
    // postgres.js takes max_lifetime in seconds.
    expect(sql.options.max_lifetime).toBe(30 * 60);
  });
});
