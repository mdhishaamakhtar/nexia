import { afterEach, describe, expect, test } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "./config";

const localYAML = `server:
  port: 9999
  mode: test
  jwt_secret: "local-secret"
  cors_origins: ["http://localhost:3000"]
db:
  host: localhost
  user: postgres
  password: pass
  name: db
`;

const releaseYAML = `server:
  mode: release
  jwt_secret: ""
  cors_origins: []
  client_ip_header: X-Real-IP
db:
  host: ""
  user: ""
  password: ""
  name: ""
  ssl_mode: require
email:
  app_base_url: ""
`;

/** Env vars a release deployment is expected to provide. */
const RELEASE_ENV = {
  NEXIA_SERVER_JWT_SECRET: "x".repeat(40),
  NEXIA_SERVER_CORS_ORIGINS: "https://nexia.example",
  NEXIA_DB_HOST: "db.internal",
  NEXIA_DB_USER: "nexia",
  NEXIA_DB_NAME: "nexia",
  NEXIA_EMAIL_APP_BASE_URL: "https://nexia.example/",
};

const touched = new Set<string>();

function setEnv(vars: Record<string, string>): void {
  for (const [k, v] of Object.entries(vars)) {
    process.env[k] = v;
    touched.add(k);
  }
}

afterEach(() => {
  for (const k of touched) delete process.env[k];
  touched.clear();
});

function configDir(files: Record<string, string>): string {
  const dir = join(mkdtempSync(join(tmpdir(), "nexia-config-")), "config");
  mkdirSync(dir);
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, `${name}.yaml`), body);
  return dir;
}

describe("loadConfig", () => {
  test("fills defaults and coerces env overrides", async () => {
    setEnv({
      NEXIA_DB_PASSWORD: "override-pass",
      NEXIA_DB_MAX_OPEN_CONNS: "80",
      NEXIA_DB_RUN_MIGRATIONS: "false",
      NEXIA_SERVER_CORS_ORIGINS: "https://a.com, https://b.com",
    });

    const cfg = await loadConfig(configDir({ local: localYAML }));

    expect(cfg.server.port).toBe(9999);
    expect(cfg.server.jwt_expiry_minutes).toBe(1440);
    expect(cfg.server.cors_origins).toEqual(["https://a.com", "https://b.com"]);
    expect(cfg.db.password).toBe("override-pass");
    expect(cfg.db.max_open_conns).toBe(80);
    expect(cfg.db.run_migrations).toBe(false);
    expect(cfg.db.idle_timeout_seconds).toBe(300);
    expect(cfg.ai.opencode_base_url).toBe("https://opencode.ai/zen/v1");
    expect(cfg.ai.chat_model).toBe("space-bunny-free");
  });

  test("a release config boots once the environment supplies the secrets", async () => {
    setEnv({ APP_ENV: "prod", ...RELEASE_ENV });

    const cfg = await loadConfig(configDir({ prod: releaseYAML }));

    expect(cfg.server.mode).toBe("release");
    expect(cfg.server.client_ip_header).toBe("x-real-ip");
    expect(cfg.email.app_base_url).toBe("https://nexia.example");
  });

  test("a release config without its secrets refuses to boot, naming each problem", async () => {
    setEnv({ APP_ENV: "prod" });

    const error = await loadConfig(configDir({ prod: releaseYAML })).catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toContain("server.jwt_secret");
    expect(message).toContain("db.host");
    expect(message).toContain("email.app_base_url");
  });

  test("a short secret is refused in release mode only", async () => {
    setEnv({ APP_ENV: "prod", ...RELEASE_ENV, NEXIA_SERVER_JWT_SECRET: "short" });
    await expect(loadConfig(configDir({ prod: releaseYAML }))).rejects.toThrow(
      "at least 32 characters"
    );

    setEnv({ APP_ENV: "local" });
    await expect(loadConfig(configDir({ local: localYAML }))).resolves.toBeDefined();
  });

  test("rejects a value that is not a number", async () => {
    setEnv({ NEXIA_DB_PORT: "five-four-three-two" });
    await expect(loadConfig(configDir({ local: localYAML }))).rejects.toThrow("db.port");
  });

  test("an empty config file names every required setting", async () => {
    await expect(loadConfig(configDir({ local: "" }))).rejects.toThrow(/server[\s\S]*db/);
  });

  test("reports a missing config file", async () => {
    await expect(loadConfig("/tmp/nonexistent-config-dir")).rejects.toThrow(
      "config file not found"
    );
  });
});
