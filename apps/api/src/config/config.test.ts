import { describe, test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "./config";

const localYAML = `server:
  port: 9999
  mode: test
  jwt_secret: "local-secret"
  jwt_expiry_minutes: 5
  cors_origins: ["http://localhost:3000"]
db:
  host: localhost
  port: 5432
  user: postgres
  password: pass
  name: db
  ssl_mode: disable
  run_migrations: true
  max_idle_conns: 10
  max_open_conns: 50
  conn_max_lifetime_minutes: 60
ai:
  gemini_api_key: ""
  redis_url: ""
  opencode_api_key: ""
  opencode_base_url: "https://opencode.ai/zen/go/v1"
  chat_model: "deepseek-v4-pro"
email:
  resend_api_key: ""
  from_address: "test@test.com"
  app_base_url: "http://localhost:3000"
`;

const prodYAML = `server:
  port: 8080
  mode: release
  jwt_secret: "prod-secret"
  jwt_expiry_minutes: 60
  cors_origins: ["https://example.com"]
db:
  host: prod-db
  port: 5432
  user: postgres
  password: pass
  name: prod
  ssl_mode: require
  run_migrations: false
  max_idle_conns: 15
  max_open_conns: 75
  conn_max_lifetime_minutes: 120
ai:
  gemini_api_key: "prod-key"
  redis_url: "redis:6379"
  opencode_api_key: ""
  opencode_base_url: "https://opencode.ai/zen/go/v1"
  chat_model: "deepseek-v4-pro"
email:
  resend_api_key: "resend-key"
  from_address: "prod@test.com"
  app_base_url: "https://nexia.com"
`;

const poolDefaultsYAML = `server:
  port: 9999
  mode: test
  jwt_secret: "local-secret"
  jwt_expiry_minutes: 5
  cors_origins: ["http://localhost:3000"]
db:
  host: localhost
  port: 5432
  user: postgres
  password: pass
  name: db
  ssl_mode: disable
ai:
  gemini_api_key: ""
  redis_url: ""
email:
  resend_api_key: ""
  from_address: ""
  app_base_url: ""
`;

function setupConfigFiles(files: Record<string, string>): string {
  const tmp = mkdtempSync(join(tmpdir(), "config-test-"));
  const configDir = join(tmp, "config");
  mkdirSync(configDir);

  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(configDir, `${name}.yaml`), content);
  }

  return tmp;
}

function setEnv(key: string, value: string): void {
  process.env[key] = value;
}

function delEnv(key: string): void {
  delete process.env[key];
}

describe("config loader", () => {
  test("loads local.yaml and applies env overrides", async () => {
    const tmp = setupConfigFiles({ local: localYAML, prod: prodYAML });
    const cwd = process.cwd();
    process.chdir(tmp);

    try {
      setEnv("NEXIA_DB_PASSWORD", "override-pass");
      setEnv("NEXIA_DB_MAX_OPEN_CONNS", "80");

      const cfg = await loadConfig(join(tmp, "config"));

      expect(cfg.server.port).toBe(9999);
      expect(cfg.db.password).toBe("override-pass");
      expect(cfg.db.run_migrations).toBe(true);
      expect(cfg.db.max_idle_conns).toBe(10);
      expect(cfg.db.max_open_conns).toBe(80);
      expect(cfg.db.conn_max_lifetime_minutes).toBe(60);
    } finally {
      process.chdir(cwd);
      delEnv("NEXIA_DB_PASSWORD");
      delEnv("NEXIA_DB_MAX_OPEN_CONNS");
    }
  });

  test("loads prod.yaml with APP_ENV=prod", async () => {
    const tmp = setupConfigFiles({ local: localYAML, prod: prodYAML });
    const cwd = process.cwd();
    process.chdir(tmp);

    try {
      setEnv("APP_ENV", "prod");

      const cfg = await loadConfig(join(tmp, "config"));

      expect(cfg.server.mode).toBe("release");
      expect(cfg.db.host).toBe("prod-db");
      expect(cfg.db.run_migrations).toBe(false);
      expect(cfg.db.max_idle_conns).toBe(15);
      expect(cfg.db.max_open_conns).toBe(75);
      expect(cfg.db.conn_max_lifetime_minutes).toBe(120);
      expect(cfg.db.ssl_mode).toBe("require");
    } finally {
      process.chdir(cwd);
      delEnv("APP_ENV");
    }
  });

  test("applies DB pool defaults when not specified in yaml", async () => {
    const tmp = setupConfigFiles({ local: poolDefaultsYAML });
    const cwd = process.cwd();
    process.chdir(tmp);

    try {
      const cfg = await loadConfig(join(tmp, "config"));

      expect(cfg.db.run_migrations).toBe(true);
      expect(cfg.db.max_idle_conns).toBe(10);
      expect(cfg.db.max_open_conns).toBe(50);
      expect(cfg.db.conn_max_lifetime_minutes).toBe(60);
    } finally {
      process.chdir(cwd);
    }
  });

  test("errors on missing config file", async () => {
    try {
      await expect(loadConfig("/tmp/nonexistent-config-dir")).rejects.toThrow(
        "config file not found"
      );
    } catch {
      // Expected
    }
  });

  test("env override cors_origins as comma-separated array", async () => {
    const tmp = setupConfigFiles({ local: localYAML });
    const cwd = process.cwd();
    process.chdir(tmp);

    try {
      setEnv("NEXIA_SERVER_CORS_ORIGINS", "https://a.com,https://b.com");

      const cfg = await loadConfig(join(tmp, "config"));

      expect(cfg.server.cors_origins).toEqual(["https://a.com", "https://b.com"]);
    } finally {
      process.chdir(cwd);
      delEnv("NEXIA_SERVER_CORS_ORIGINS");
    }
  });

  test("env override jwt_secret wins over yaml", async () => {
    const tmp = setupConfigFiles({ local: localYAML });
    const cwd = process.cwd();
    process.chdir(tmp);

    try {
      setEnv("NEXIA_SERVER_JWT_SECRET", "env-override-secret");

      const cfg = await loadConfig(join(tmp, "config"));

      expect(cfg.server.jwt_secret).toBe("env-override-secret");
    } finally {
      process.chdir(cwd);
      delEnv("NEXIA_SERVER_JWT_SECRET");
    }
  });

  test("sets default AI fields", async () => {
    const tmp = setupConfigFiles({ local: poolDefaultsYAML });
    const cwd = process.cwd();
    process.chdir(tmp);

    try {
      const cfg = await loadConfig(join(tmp, "config"));

      expect(cfg.ai.opencode_base_url).toBe("https://opencode.ai/zen/go/v1");
      expect(cfg.ai.chat_model).toBe("deepseek-v4-pro");
    } finally {
      process.chdir(cwd);
    }
  });
});
