import { loadConfig } from "../config/config";
import { createLogger } from "../logging/logger";
import { createDb } from "../db/client";
import { profiles } from "../db/schema";
import { EmbeddingQueueProducer, createRedisConnection } from "../queue/producer";

/**
 * One-shot back-fill: enqueues an embedding task for every existing profile.
 * Run after configuring Gemini for the first time or after wiping Redis.
 */
async function main(): Promise<void> {
  const config = await loadConfig(Bun.env.CONFIG_DIR ?? "config");
  const logger = createLogger(config).child({ component: "sync" });

  if (!config.ai.gemini_api_key) {
    logger.error("NEXIA_AI_GEMINI_API_KEY is required to back-fill embeddings");
    process.exit(1);
  }
  if (!config.ai.redis_url) {
    logger.error("NEXIA_AI_REDIS_URL is required to back-fill embeddings");
    process.exit(1);
  }

  const { db, sql } = createDb(config);
  const redis = createRedisConnection(config.ai.redis_url);
  const producer = new EmbeddingQueueProducer(redis, logger);

  const rows = await db.select({ id: profiles.id }).from(profiles).orderBy(profiles.id);
  logger.info({ count: rows.length }, "enqueuing embedding tasks");

  for (const row of rows) {
    await producer.enqueueEmbeddingTask(row.id);
  }

  logger.info({ count: rows.length }, "done; tasks enqueued");

  await producer.close();
  redis.disconnect();
  await sql.end({ timeout: 5 });
  process.exit(0);
}

await main();
