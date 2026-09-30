import type { Hono } from "hono";
import type { LanguageModel } from "ai";
import { buildApp } from "./routes/routes";
import { loadConfig, type Config } from "./config/config";
import { createLogger, type Logger } from "./logging/logger";
import { createDb, type DB } from "./db/client";
import { runMigrations } from "./db/migrate";
import { UserRepository } from "./repositories/user";
import { EmailTokenRepository } from "./repositories/email-token";
import { ProfileRepository } from "./repositories/profile";
import { EmbeddingRepository } from "./repositories/embedding";
import { emailVerificationTokens, passwordResetTokens } from "./db/schema";
import { EmailService } from "./email/email-service";
import { AuthService, type PasswordHasher } from "./services/auth-service";
import { createBcryptHasher } from "./services/password-hasher";
import { ProfileService } from "./services/profile-service";
import { EmbeddingService, type EmbeddingGenerator } from "./services/embedding-service";
import { EmbeddingWorker } from "./services/embedding-worker";
import { ChatAgent } from "./ai/agent";
import { createEmbeddingGenerator } from "./ai/embeddings";
import { createChatModel } from "./ai/provider";

/**
 * Everything `wireApp` needs, already constructed. Keeping the optional
 * collaborators (model, embeddings) as parameters rather than building them
 * inside means the graph can be assembled against a mocked model and a
 * throwaway container without touching config files or the network.
 */
export interface RuntimeDeps {
  config: Config;
  logger: Logger;
  db: DB;
  hasher: PasswordHasher;
  chatModel: LanguageModel | null;
  embeddingGenerator: EmbeddingGenerator | null;
}

export interface Runtime {
  app: Hono;
  config: Config;
  logger: Logger;
  embeddingService: EmbeddingService | null;
  /** Not started: `createApp` starts it, tests drive it with `drain()`. */
  embeddingWorker: EmbeddingWorker | null;
  close: () => Promise<void>;
}

/**
 * Pure wiring: no config loading, no connections opened, no migrations, no
 * timers. Given a database handle and the optional AI collaborators, returns
 * the Hono app plus the background worker a caller may start or drive.
 */
export function wireApp(deps: RuntimeDeps): Runtime {
  const { config, logger, db, hasher, chatModel, embeddingGenerator } = deps;

  const userRepo = new UserRepository(db);
  const authService = new AuthService(
    userRepo,
    new EmailTokenRepository(db, passwordResetTokens),
    new EmailTokenRepository(db, emailVerificationTokens),
    new EmailService(config, logger),
    hasher,
    logger.child({ component: "auth" })
  );

  // The embedding half of the system is optional end to end: without a
  // generator there is nothing to store and semantic search is unavailable.
  const embeddingService = embeddingGenerator
    ? new EmbeddingService(
        new EmbeddingRepository(db),
        embeddingGenerator,
        logger.child({ component: "embeddings" })
      )
    : null;
  const embeddingWorker = embeddingService
    ? new EmbeddingWorker(
        embeddingService,
        logger.child({ component: "embedding_worker" }),
        config.ai.embedding_interval_seconds * 1000
      )
    : null;

  const profileService = new ProfileService(new ProfileRepository(db), embeddingWorker);
  const chatAgent = new ChatAgent({
    model: chatModel,
    profileService,
    embeddingService,
    secret: config.server.jwt_secret,
  });

  const app = buildApp({
    config,
    logger,
    db,
    sessions: userRepo,
    authService,
    profileService,
    chatAgent,
  });

  return {
    app: app as unknown as Hono,
    config,
    logger,
    embeddingService,
    embeddingWorker,
    close: async () => {
      await embeddingWorker?.stop();
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
 * Production entry point: loads config, opens the database, runs migrations,
 * hands the result to `wireApp` and starts the embedding worker.
 */
export async function createApp(configDir = "config"): Promise<Bootstrap> {
  const config = await loadConfig(configDir);
  const logger = createLogger(config);

  const { db, sql } = createDb(config);
  if (config.db.run_migrations) {
    await runMigrations(sql, logger);
  }

  const embeddingGenerator = config.ai.gemini_api_key
    ? createEmbeddingGenerator(config.ai.gemini_api_key)
    : null;
  if (!embeddingGenerator) {
    logger.warn("Gemini API key not set: embeddings and semantic search are disabled");
  }

  const chatModel = createChatModel(config);
  if (!chatModel) {
    logger.warn("OpenCode API key not set: chat is disabled");
  }

  const runtime = wireApp({
    config,
    logger,
    db,
    hasher: createBcryptHasher(),
    chatModel,
    embeddingGenerator,
  });
  runtime.embeddingWorker?.start();

  const shutdown = async (): Promise<void> => {
    logger.info("shutting down");
    await runtime.close();
    await sql.end({ timeout: 5 });
  };

  return { app: runtime.app, config, logger, shutdown };
}
