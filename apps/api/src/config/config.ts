import { z } from "zod";
import YAML from "yaml";

export const serverConfigSchema = z.object({
  port: z.number().default(8080),
  mode: z.enum(["debug", "release", "test"]).default("debug"),
  jwt_secret: z.string(),
  jwt_expiry_minutes: z.number().default(1440),
  cors_origins: z.array(z.string()).default([]),
  cookie_domain: z.string().default(""),
  auth_rate_limit_requests: z.number().default(10),
  auth_rate_limit_window_seconds: z.number().default(10),
  auth_rate_limit_burst: z.number().default(10),
  chat_rate_limit_requests: z.number().default(10),
  chat_rate_limit_window_seconds: z.number().default(60),
  chat_rate_limit_burst: z.number().default(3),
});

export const dbConfigSchema = z.object({
  host: z.string(),
  port: z.number().default(5432),
  user: z.string(),
  password: z.string(),
  name: z.string(),
  ssl_mode: z.enum(["disable", "require"]).default("disable"),
  run_migrations: z.boolean().default(true),
  max_idle_conns: z.number().default(10),
  max_open_conns: z.number().default(50),
  conn_max_lifetime_minutes: z.number().default(60),
});

export const aiConfigSchema = z.object({
  gemini_api_key: z.string().default(""),
  redis_url: z.string().default("127.0.0.1:6379"),
  opencode_api_key: z.string().default(""),
  opencode_base_url: z.string().default("https://opencode.ai/zen/go/v1"),
  chat_model: z.string().default("deepseek-v4-pro"),
});

export const emailConfigSchema = z.object({
  resend_api_key: z.string().default(""),
  from_address: z.string().default("Nexia <noreply@nexia.hishaam.dev>"),
  app_base_url: z.string().default("http://localhost:3000"),
});

export const configSchema = z.object({
  server: serverConfigSchema,
  db: dbConfigSchema,
  ai: aiConfigSchema,
  email: emailConfigSchema,
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type DBConfig = z.infer<typeof dbConfigSchema>;
export type AIConfig = z.infer<typeof aiConfigSchema>;
export type EmailConfig = z.infer<typeof emailConfigSchema>;
export type Config = z.infer<typeof configSchema>;

const ENV_PREFIX = "NEXIA_";

function coerceValue(section: string, key: string, value: string): unknown {
  if (key === "cors_origins") {
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (section === "db") {
    const intFields = [
      "port",
      "max_idle_conns",
      "max_open_conns",
      "conn_max_lifetime_minutes",
    ];
    if (intFields.includes(key)) return Number(value);
  }
  if (section === "server") {
    const intFields = [
      "port",
      "jwt_expiry_minutes",
      "auth_rate_limit_requests",
      "auth_rate_limit_window_seconds",
      "auth_rate_limit_burst",
      "chat_rate_limit_requests",
      "chat_rate_limit_window_seconds",
      "chat_rate_limit_burst",
    ];
    if (intFields.includes(key)) return Number(value);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function applyEnvOverrides(raw: Record<string, unknown>): void {
  for (const [name, value] of Object.entries(process.env)) {
    if (!name.startsWith(ENV_PREFIX) || value === undefined || value === "") continue;
    const parts = name.slice(ENV_PREFIX.length).toLowerCase().split("_");
    if (parts.length < 2) continue;
    const section = parts[0]!;
    const key = parts.slice(1).join("_");
    if (!section || !key) continue;

    const sectionObj = (raw[section] ??= {}) as Record<string, unknown>;
    sectionObj[key] = coerceValue(section, key, value);
  }
}

export async function loadConfig(configDir = "config"): Promise<Config> {
  const env = process.env.APP_ENV ?? "local";
  const file = Bun.file(`${configDir}/${env}.yaml`);
  if (!(await file.exists())) {
    throw new Error(`config file not found: ${configDir}/${env}.yaml`);
  }
  const text = await file.text();
  const raw = YAML.parse(text) as Record<string, unknown>;
  applyEnvOverrides(raw);
  return configSchema.parse(raw);
}
