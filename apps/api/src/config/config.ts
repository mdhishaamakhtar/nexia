import { readFile } from "node:fs/promises";
import { z } from "zod";
import YAML from "yaml";

/** "true"/"false" from an env var become booleans; anything else is left for Zod to reject. */
const booleanish = z.preprocess(
  (v) => (v === "true" ? true : v === "false" ? false : v),
  z.boolean()
);

/** A list may come from YAML as an array or from an env var as "a, b, c". */
const stringList = z.preprocess(
  (v) =>
    typeof v === "string"
      ? v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : v,
  z.array(z.string())
);

const count = z.coerce.number().int().positive();

export const serverConfigSchema = z.object({
  port: z.coerce.number().int().min(0).default(8080),
  mode: z.enum(["debug", "release", "test"]).default("debug"),
  jwt_secret: z.string().min(1, "server.jwt_secret is required"),
  jwt_expiry_minutes: count.default(1440),
  cors_origins: stringList.default([]),
  cookie_domain: z.string().default(""),
  /**
   * Header the reverse proxy writes the client's address into (Railway sets
   * `x-real-ip`). Empty means "use the socket address", which is only right
   * when nothing sits in front of the server.
   */
  client_ip_header: z.string().trim().toLowerCase().default(""),
  auth_rate_limit_requests: count.default(10),
  auth_rate_limit_window_seconds: count.default(10),
  auth_rate_limit_burst: count.default(10),
  chat_rate_limit_requests: count.default(10),
  chat_rate_limit_window_seconds: count.default(60),
  chat_rate_limit_burst: count.default(3),
});

export const dbConfigSchema = z.object({
  host: z.string().min(1, "db.host is required"),
  port: z.coerce.number().int().positive().default(5432),
  user: z.string().min(1, "db.user is required"),
  password: z.string(),
  name: z.string().min(1, "db.name is required"),
  ssl_mode: z.enum(["disable", "require"]).default("disable"),
  run_migrations: booleanish.default(true),
  max_open_conns: count.default(50),
  conn_max_lifetime_minutes: count.default(60),
  /** Seconds an idle pooled connection is kept before being closed. */
  idle_timeout_seconds: count.default(300),
});

export const aiConfigSchema = z.object({
  gemini_api_key: z.string().default(""),
  opencode_api_key: z.string().default(""),
  opencode_base_url: z.string().default("https://opencode.ai/zen/v1"),
  chat_model: z.string().default("space-bunny-free"),
  /** How often the embedding worker looks for profiles to (re-)embed. */
  embedding_interval_seconds: count.default(30),
});

export const emailConfigSchema = z.object({
  resend_api_key: z.string().default(""),
  from_address: z.string().default("Nexia <noreply@nexia.hishaam.dev>"),
  app_base_url: z
    .string()
    .default("http://localhost:3000")
    .transform((v) => (v === "" ? "http://localhost:3000" : v.replace(/\/+$/, ""))),
});

export const configSchema = z
  .object({
    server: serverConfigSchema,
    db: dbConfigSchema,
    // Both sections are optional in the file; `prefault` runs the empty object
    // through the schema, so every field default still applies.
    ai: aiConfigSchema.prefault({}),
    email: emailConfigSchema.prefault({}),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.server.mode !== "release") return;
    // A short or shared secret makes every session forgeable. Refuse to boot
    // rather than find out from a login that fails at signing time.
    if (cfg.server.jwt_secret.length < 32) {
      ctx.addIssue({
        code: "custom",
        path: ["server", "jwt_secret"],
        message: "must be at least 32 characters in release mode",
      });
    }
    if (!cfg.email.app_base_url.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["email", "app_base_url"],
        message:
          "must be the web app's https URL in release mode, or email links will point at localhost",
      });
    }
    if (cfg.server.cors_origins.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["server", "cors_origins"],
        message: "must list the web app's origin in release mode",
      });
    }
  });

export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type DBConfig = z.infer<typeof dbConfigSchema>;
export type AIConfig = z.infer<typeof aiConfigSchema>;
export type EmailConfig = z.infer<typeof emailConfigSchema>;
export type Config = z.infer<typeof configSchema>;

const ENV_PREFIX = "NEXIA_";

/**
 * `NEXIA_DB_PASSWORD` overrides `db.password`: the first segment names the
 * section and the rest the key. Values stay strings; the schema coerces them.
 */
function applyEnvOverrides(raw: Record<string, unknown>): void {
  for (const [name, value] of Object.entries(process.env)) {
    if (!name.startsWith(ENV_PREFIX) || value === undefined || value === "") continue;
    const [section, ...rest] = name.slice(ENV_PREFIX.length).toLowerCase().split("_");
    const key = rest.join("_");
    if (!section || !key) continue;

    const sectionObj = (raw[section] ??= {}) as Record<string, unknown>;
    sectionObj[key] = value;
  }
}

export async function loadConfig(configDir = "config"): Promise<Config> {
  const env = process.env.APP_ENV ?? "local";
  const path = `${configDir}/${env}.yaml`;

  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`config file not found: ${path}`);
    }
    throw err;
  }

  const raw = (YAML.parse(text) ?? {}) as Record<string, unknown>;
  applyEnvOverrides(raw);

  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`invalid configuration (${path}):\n  ${problems.join("\n  ")}`);
  }
  return parsed.data;
}
