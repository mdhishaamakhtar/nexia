import { buildApp } from "./routes/routes";
import { loadConfig } from "./config/config";
import { createLogger } from "./logging/logger";
import { createDb } from "./db/client";
import { runMigrations } from "./db/migrate";
import { UserRepository } from "./repositories/user";
import { PasswordResetRepository } from "./repositories/password-reset";
import { EmailVerificationRepository } from "./repositories/email-verification";
import { ProfileRepository } from "./repositories/profile";
import { EmbeddingRepository } from "./repositories/embedding";
import { EmailService } from "./email/email-service";
import { AuthService } from "./services/auth-service";
import { ProfileService } from "./services/profile-service";
import { EmbeddingService } from "./services/embedding-service";
import { ChatAgent } from "./ai/agent";
import { createEmbeddingGenerator } from "./ai/embeddings";
import { createChatModel } from "./ai/provider";
import { createWorker } from "./queue/worker";
import { EmbeddingQueueProducer, createRedisConnection } from "./queue/producer";
import Redis from "ioredis";

export async function createApp(configDir = "config") {
  const config = await loadConfig(configDir);
  const logger = createLogger(config);

  // DB
  const { db, sql } = createDb(config);

  // Migrations
  if (config.db.run_migrations) {
    await runMigrations(sql, logger);
  }

  // Repositories
  const userRepo = new UserRepository(db);
  const passwordResetRepo = new PasswordResetRepository(db);
  const emailVerificationRepo = new EmailVerificationRepository(db);
  const profileRepo = new ProfileRepository(db);

  // Email
  const emailService = new EmailService(config, logger);

  // Auth Service
  const authService = new AuthService(
    userRepo, passwordResetRepo, emailVerificationRepo,
    emailService, config, logger,
  );

  // Embedding infrastructure (optional)
  let embeddingRepo: EmbeddingRepository | null = null;
  let embeddingGenerator: ReturnType<typeof createEmbeddingGenerator> | null = null;
  let embeddingService: EmbeddingService | null = null;
  let embeddingQueueProducer: EmbeddingQueueProducer | null = null;
  let redis: Redis | null = null;

  if (config.ai.gemini_api_key) {
    embeddingGenerator = createEmbeddingGenerator(config.ai.gemini_api_key);
    embeddingRepo = new EmbeddingRepository(db, logger);

    if (config.ai.redis_url) {
      try {
        redis = createRedisConnection(config.ai.redis_url);

        if (redis) {
          embeddingQueueProducer = new EmbeddingQueueProducer(redis, logger);

          // Worker
          if (embeddingRepo && embeddingGenerator) {
            embeddingService = new EmbeddingService(
              profileRepo, embeddingGenerator, embeddingRepo, logger,
            );
            createWorker(redis, embeddingService, logger);
          }
        }
      } catch (err) {
        logger.warn({ err: String(err) }, "Redis connection failed, embedding queue disabled");
      }
    }
  }

  // Profile Service
  const profileService = new ProfileService(profileRepo, embeddingQueueProducer, logger);

  // Chat Agent
  const chatModel = createChatModel(config);
  const chatAgent = new ChatAgent(chatModel, profileService, embeddingRepo, embeddingGenerator);

  return buildApp({
    config,
    logger,
    db,
    userLookup: userRepo,
    authService,
    profileService,
    chatAgent,
  });
}
