import { inject } from "vitest";
import type { Hono } from "hono";
import type Redis from "ioredis";
import type { LanguageModel } from "ai";
import pino from "pino";
import { wireApp, type Runtime } from "../../src/app";
import type {
  Config,
  ServerConfig,
  DBConfig,
  AIConfig,
  EmailConfig,
} from "../../src/config/config";
import { createDb, type DB } from "../../src/db/client";
import { createRedisConnection } from "../../src/queue/producer";
import { createBcryptHasher } from "../../src/services/password-hasher";
import { getTestDb } from "./db";
import { createFakeEmbeddingGenerator, type FakeEmbeddingGenerator } from "./embeddings";

export interface ConfigOverrides {
  server?: Partial<ServerConfig>;
  db?: Partial<DBConfig>;
  ai?: Partial<AIConfig>;
  email?: Partial<EmailConfig>;
}

/**
 * A complete Config pointed at the throwaway container. Rate limits default far
 * above anything a normal test will reach, so only the tests that mean to
 * exercise throttling ever see a 429.
 */
export function testConfig(overrides: ConfigOverrides = {}): Config {
  const url = new URL(inject("databaseUrl"));

  return {
    server: {
      port: 0,
      mode: "test",
      jwt_secret: "test-jwt-secret",
      jwt_expiry_minutes: 60,
      cors_origins: ["http://localhost:3000"],
      cookie_domain: "",
      auth_rate_limit_requests: 10_000,
      auth_rate_limit_window_seconds: 10,
      auth_rate_limit_burst: 10_000,
      chat_rate_limit_requests: 10_000,
      chat_rate_limit_window_seconds: 60,
      chat_rate_limit_burst: 10_000,
      ...overrides.server,
    },
    db: {
      host: url.hostname,
      port: Number(url.port),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      name: url.pathname.slice(1),
      ssl_mode: "disable",
      run_migrations: false,
      max_idle_conns: 2,
      max_open_conns: 5,
      conn_max_lifetime_minutes: 60,
      ...overrides.db,
    },
    ai: {
      gemini_api_key: "test-gemini-key",
      redis_url: "",
      opencode_api_key: "test-opencode-key",
      opencode_base_url: "https://example.invalid/v1",
      chat_model: "mock-model",
      ...overrides.ai,
    },
    email: {
      resend_api_key: "test-resend-key",
      from_address: "Nexia <noreply@nexia.test>",
      app_base_url: "http://localhost:3000",
      ...overrides.email,
    },
  };
}

export interface HarnessOptions {
  /** Scripted model for chat tests; omit for a graph with AI disabled. */
  chatModel?: LanguageModel | null;
  /** Defaults to true — a deterministic local embedder, never the network. */
  withEmbeddings?: boolean;
  /** Opt in to a real BullMQ producer + worker against the Redis container. */
  withQueue?: boolean;
  config?: ConfigOverrides;
}

export interface Harness {
  app: Hono;
  runtime: Runtime;
  config: Config;
  db: DB;
  sql: ReturnType<typeof getTestDb>["sql"];
  embeddings: FakeEmbeddingGenerator | null;
  redis: Redis | null;
  close: () => Promise<void>;
}

/**
 * Builds the real application graph — real repositories, real services, the real
 * Hono router — against the container database. Only the two outbound edges that
 * would otherwise hit the network are substituted: the language model and the
 * embedding provider. Resend is intercepted by MSW instead (see email.ts).
 */
export function createHarness(options: HarnessOptions = {}): Harness {
  const { chatModel = null, withEmbeddings = true, withQueue = false } = options;

  const config = testConfig(options.config);
  const logger = pino({ level: "silent" });

  // Normally every harness shares the worker's pool. A test that overrides the
  // db config is asking for a different connection (a wrong port, say), so it
  // gets a dedicated pool that is torn down with the harness.
  const ownsPool = options.config?.db !== undefined;
  const { db, sql } = ownsPool ? createDb(config) : getTestDb();

  const embeddings = withEmbeddings ? createFakeEmbeddingGenerator() : null;
  const redis = withQueue ? createRedisConnection(inject("redisUrl")) : null;

  const runtime = wireApp({
    config,
    logger,
    db,
    // Cost 4 rather than the production 10: still real bcrypt, ~80x faster.
    hasher: createBcryptHasher(4),
    chatModel,
    embeddingGenerator: embeddings,
    redis,
  });

  return {
    app: runtime.app,
    runtime,
    config,
    db,
    sql,
    embeddings,
    redis,
    close: async () => {
      await runtime.close();
      redis?.disconnect();
      if (ownsPool) await sql.end({ timeout: 5 }).catch(() => {});
    },
  };
}
