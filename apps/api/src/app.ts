import type { Hono } from "hono";
import type Redis from "ioredis";
import type { Worker } from "bullmq";
import type { LanguageModel } from "ai";
import { buildApp } from "./routes/routes";
import { loadConfig, type Config } from "./config/config";
import { createLogger, type Logger } from "./logging/logger";
import { createDb, type DB } from "./db/client";
import { runMigrations } from "./db/migrate";
import { UserRepository } from "./repositories/user";
import { PasswordResetRepository } from "./repositories/password-reset";
import { EmailVerificationRepository } from "./repositories/email-verification";
import { ProfileRepository } from "./repositories/profile";
import { EmbeddingRepository } from "./repositories/embedding";
import { EmailService } from "./email/email-service";
import { AuthService, type PasswordHasher } from "./services/auth-service";
import { createBcryptHasher } from "./services/password-hasher";
import { ProfileService } from "./services/profile-service";
import { EmbeddingService } from "./services/embedding-service";
import { ChatAgent } from "./ai/agent";
import { createEmbeddingGenerator, type EmbeddingGenerator } from "./ai/embeddings";
import { createChatModel } from "./ai/provider";
import { createWorker } from "./queue/worker";
import { EmbeddingQueueProducer, createRedisConnection } from "./queue/producer";

/**
 * Everything `wireApp` needs, already constructed. Keeping the optional
 * collaborators (model, embeddings, redis) as parameters rather than building
 * them inside means the graph can be assembled against a mocked model and a
 * throwaway container without touching config files or the network.
 */
export interface RuntimeDeps {
  config: Config;
  logger: Logger;
  db: DB;
  hasher: PasswordHasher;
  chatModel: LanguageModel | null;
  embeddingGenerator: EmbeddingGenerator | null;
  redis: Redis | null;
}

export interface Runtime {
  app: Hono;
  config: Config;
  logger: Logger;
  queue: EmbeddingQueueProducer | null;
  worker: Worker | null;
  embeddingService: EmbeddingService | null;
  close: () => Promise<void>;
}

/**
 * Pure wiring: no config loading, no connections opened, no migrations. Given a
 * database handle and the optional AI/queue collaborators, returns the Hono app
 * plus the background pieces a caller may need to drive or shut down.
 */
export function wireApp(deps: RuntimeDeps): Runtime {
  const { config, logger, db, hasher, chatModel, embeddingGenerator, redis } = deps;

  const userRepo = new UserRepository(db);
  const profileRepo = new ProfileRepository(db);
  const emailService = new EmailService(config, logger);

  const authService = new AuthService(
    userRepo,
    new PasswordResetRepository(db),
    new EmailVerificationRepository(db),
    emailService,
    hasher,
    config,
    logger
  );

  // The embedding half of the system is optional end to end: without a
  // generator there is nothing to store, and without Redis nothing to schedule.
  const embeddingRepo = embeddingGenerator ? new EmbeddingRepository(db, logger) : null;
  const embeddingService =
    embeddingGenerator && embeddingRepo
      ? new EmbeddingService(profileRepo, embeddingGenerator, embeddingRepo, logger)
      : null;

  const queue = redis ? new EmbeddingQueueProducer(redis, logger) : null;
  const worker = redis && embeddingService ? createWorker(redis, embeddingService, logger) : null;

  const profileService = new ProfileService(profileRepo, queue, logger);
  const chatAgent = new ChatAgent(chatModel, profileService, embeddingRepo, embeddingGenerator);

  const app = buildApp({
    config,
    logger,
    db,
    userLookup: userRepo,
    authService,
    profileService,
    chatAgent,
  });

  return {
    app,
    config,
    logger,
    queue,
    worker,
    embeddingService,
    close: async () => {
      await worker?.close();
      await queue?.close();
    },
  };
}

export interface Bootstrap {
  app: Hono;
  config: Config;
  logger: Logger;
  shutdown: () => Promise<void>;
}

/**
 * Production entry point: loads config, opens the database, runs migrations and
 * hands the result to `wireApp`.
 */
export async function createApp(configDir = "config"): Promise<Bootstrap> {
  const config = await loadConfig(configDir);
  const logger = createLogger(config);

  const { db, sql } = createDb(config);
  if (config.db.run_migrations) {
    await runMigrations(sql, logger);
  }

  let embeddingGenerator: EmbeddingGenerator | null = null;
  let redis: Redis | null = null;

  if (config.ai.gemini_api_key) {
    embeddingGenerator = createEmbeddingGenerator(config.ai.gemini_api_key);

    if (config.ai.redis_url) {
      try {
        redis = createRedisConnection(config.ai.redis_url);
      } catch (err) {
        logger.warn({ err: String(err) }, "Redis connection failed, embedding queue disabled");
        redis = null;
      }
    }
  } else {
    logger.warn("Gemini API key not set — embedding pipeline and RAG search disabled");
  }

  const runtime = wireApp({
    config,
    logger,
    db,
    hasher: createBcryptHasher(),
    chatModel: createChatModel(config),
    embeddingGenerator,
    redis,
  });

  const shutdown = async (): Promise<void> => {
    logger.info("shutting down");
    await runtime.close();
    redis?.disconnect();
    await sql.end({ timeout: 5 });
  };

  return { app: runtime.app, config, logger, shutdown };
}
