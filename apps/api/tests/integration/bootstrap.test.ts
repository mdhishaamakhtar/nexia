import { describe, test, expect, afterEach, inject } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres from "postgres";
import { createApp, type Bootstrap } from "../../src/app";

const started: Bootstrap[] = [];
const open: Array<ReturnType<typeof postgres>> = [];

afterEach(async () => {
  await Promise.allSettled(started.splice(0).map((b) => b.shutdown()));
  await Promise.allSettled(open.splice(0).map((sql) => sql.end({ timeout: 5 })));
});

async function freshDatabaseUrl(name: string): Promise<URL> {
  const adminUrl = inject("databaseUrl");
  const admin = postgres(adminUrl, { max: 1 });
  open.push(admin);
  await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);
  await admin.unsafe(`CREATE DATABASE "${name}"`);

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return url;
}

/** Writes a config directory of the shape loadConfig expects. */
function writeConfigDir(config: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "nexia-bootstrap-"));
  const dir = join(root, "config");
  mkdirSync(dir);
  writeFileSync(join(dir, "local.yaml"), JSON.stringify(config));
  return dir;
}

async function boot(overrides: {
  dbName: string;
  ai?: Record<string, unknown>;
}): Promise<Bootstrap> {
  const url = await freshDatabaseUrl(overrides.dbName);
  const dir = writeConfigDir({
    server: { port: 0, mode: "test", jwt_secret: "bootstrap-secret" },
    db: {
      host: url.hostname,
      port: Number(url.port),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      name: url.pathname.slice(1),
      run_migrations: true,
    },
    ai: overrides.ai ?? {},
    email: {},
  });

  const bootstrap = await createApp(dir);
  started.push(bootstrap);
  return bootstrap;
}

describe("createApp", () => {
  test("loads config, migrates and serves", async () => {
    const { app, config } = await boot({ dbName: "bootstrap_basic" });

    expect(config.server.jwt_secret).toBe("bootstrap-secret");

    const health = await app.request("/api/v1/healthz");
    expect(health.status).toBe(200);

    // readyz only passes once the connection works, which also proves the
    // migrations it ran on the way up did not leave the database unusable.
    const ready = await app.request("/api/v1/readyz");
    expect(ready.status).toBe(200);
  });

  test("disables the AI surface when no Gemini key is configured", async () => {
    const { app, config } = await boot({ dbName: "bootstrap_no_ai" });
    expect(config.ai.gemini_api_key).toBe("");

    const res = await app.request("/api/v1/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });
    // Unauthenticated, but the point is that boot succeeded without AI at all.
    expect(res.status).toBe(401);
  });

  test("brings up the queue when Gemini and Redis are both configured", async () => {
    const { app } = await boot({
      dbName: "bootstrap_with_queue",
      ai: { gemini_api_key: "test-key", redis_url: inject("redisUrl") },
    });

    expect((await app.request("/api/v1/healthz")).status).toBe(200);
  });

  test("skips the queue when Redis is not configured", async () => {
    const { app } = await boot({
      dbName: "bootstrap_no_redis",
      ai: { gemini_api_key: "test-key", redis_url: "" },
    });

    expect((await app.request("/api/v1/healthz")).status).toBe(200);
  });

  test("reports a missing config file clearly", async () => {
    await expect(createApp("/nonexistent/config/dir")).rejects.toThrow(/config file not found/);
  });

  test("shutdown closes cleanly and is safe to await", async () => {
    const bootstrap = await boot({
      dbName: "bootstrap_shutdown",
      ai: { gemini_api_key: "test-key", redis_url: inject("redisUrl") },
    });

    await bootstrap.shutdown();
    // Remove it so afterEach does not shut down an already-closed pool.
    started.splice(started.indexOf(bootstrap), 1);

    const ready = await bootstrap.app.request("/api/v1/readyz");
    expect(ready.status).toBe(503);
  });
});
