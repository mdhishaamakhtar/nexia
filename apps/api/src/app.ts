import type { Hono } from "hono";
import type Redis from "ioredis";
import type { Worker } from "bullmq";
import { buildApp } from "./routes/routes";
import { loadConfig, type Config } from "./config/config";
import { createLogger, type Logger } from "./logging/logger";
import { createDb } from "./db/client";
import { runMigrations } from "./db/migrate";
import { UserRepository } from "./repositories/user";
import { PasswordResetRepository } from "./repositories/password-reset";
import { EmailVerificationRepository } from "./repositories/email-verification";
import { ProfileRepository } from "./repositories/profile";
import { EmbeddingRepository } from "./repositories/embedding";
import { EmailService } from "./email/email-service";
import { AuthService } from "./services/auth-service";
import { createBcryptHasher } from "./services/password-hasher";
import { ProfileService } from "./services/profile-service";
import { EmbeddingService } from "./services/embedding-service";
import { ChatAgent } from "./ai/agent";
import { createEmbeddingGenerator, type EmbeddingGenerator } from "./ai/embeddings";
import { createChatModel } from "./ai/provider";
import { createWorker } from "./queue/worker";
import { EmbeddingQueueProducer, createRedisConnection } from "./queue/producer";

export interface Bootstrap {
  app: Hono;
  config: Config;
  logger: Logger;
  shutdown: () => Promise<void>;
}

/**
 * Wires the full application graph (config → db → migrations → repos → services
 * → agent → router) and returns the Hono app plus a graceful shutdown hook.
 * The embedding pipeline (Gemini + Redis/BullMQ) is optional: when either is
 * unconfigured, CRUD still works and the agent degrades gracefully.
 */
export async function createApp(configDir = "config"): Promise<Bootstrap> {
  const config = await loadConfig(configDir);
  const logger = createLogger(config);

  const { db, sql } = createDb(config);
  if (config.db.run_migrations) {
    await runMigrations(sql, logger);
  }

  const userRepo = new UserRepository(db);
  const profileRepo = new ProfileRepository(db);
  const emailService = new EmailService(config, logger);

  const authService = new AuthService(
    userRepo,
    new PasswordResetRepository(db),
    new EmailVerificationRepository(db),
    emailService,
    createBcryptHasher(),
    config,
    logger
  );

  // Optional embedding/RAG infrastructure.
  let embeddingRepo: EmbeddingRepository | null = null;
  let embeddingGenerator: EmbeddingGenerator | null = null;
  let queueProducer: EmbeddingQueueProducer | null = null;
  let worker: Worker | null = null;
  let redis: Redis | null = null;

  if (config.ai.gemini_api_key) {
    embeddingGenerator = createEmbeddingGenerator(config.ai.gemini_api_key);
    embeddingRepo = new EmbeddingRepository(db, logger);

    if (config.ai.redis_url) {
      try {
        redis = createRedisConnection(config.ai.redis_url);
        queueProducer = new EmbeddingQueueProducer(redis, logger);
        const embeddingService = new EmbeddingService(
          profileRepo,
          embeddingGenerator,
          embeddingRepo,
          logger
        );
        worker = createWorker(redis, embeddingService, logger);
      } catch (err) {
        logger.warn({ err: String(err) }, "Redis connection failed, embedding queue disabled");
        redis = null;
        queueProducer = null;
      }
    }
  } else {
    logger.warn("Gemini API key not set — embedding pipeline and RAG search disabled");
  }

  const profileService = new ProfileService(profileRepo, queueProducer, logger);
  const chatAgent = new ChatAgent(
    createChatModel(config),
    profileService,
    embeddingRepo,
    embeddingGenerator
  );

  const app = buildApp({
    config,
    logger,
    db,
    userLookup: userRepo,
    authService,
    profileService,
    chatAgent,
  });

  const shutdown = async (): Promise<void> => {
    logger.info("shutting down");
    await worker?.close();
    await queueProducer?.close();
    redis?.disconnect();
    await sql.end({ timeout: 5 });
  };

  return { app, config, logger, shutdown };
}
