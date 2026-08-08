import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer, type StartedRedisContainer } from "@testcontainers/redis";
import postgres from "postgres";
import pino from "pino";
import type { GlobalSetupContext } from "vitest/node";
import { runMigrations } from "../../src/db/migrate";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
    redisUrl: string;
  }
}

/**
 * Starts one Postgres and one Redis for the entire integration run and applies
 * the real migrations once. Per-file containers would be cleaner in isolation
 * but turn a fifteen-second suite into a multi-minute one; tests get their
 * isolation from truncation between cases instead (see setup/each.ts).
 *
 * The Postgres image matches docker-compose exactly, so pgvector behaves here
 * the way it does in development.
 */
export default async function setup({ provide }: GlobalSetupContext) {
  let pg: StartedPostgreSqlContainer;
  let redis: StartedRedisContainer;

  try {
    [pg, redis] = await Promise.all([
      new PostgreSqlContainer("pgvector/pgvector:pg17").start(),
      new RedisContainer("redis:7-alpine").start(),
    ]);
  } catch (err) {
    throw new Error(
      `failed to start test containers — is Docker running?\n${err instanceof Error ? err.message : String(err)}`
    );
  }

  const databaseUrl = pg.getConnectionUri();
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    await runMigrations(sql, pino({ level: "silent" }));
  } finally {
    await sql.end({ timeout: 5 });
  }

  provide("databaseUrl", databaseUrl);
  provide("redisUrl", redis.getConnectionUrl());

  return async () => {
    await Promise.allSettled([redis.stop(), pg.stop()]);
  };
}
