import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { Config } from "../config/config";
import * as schema from "./schema";

export type DB = ReturnType<typeof drizzle<typeof schema>>;

export function createDb(cfg: Config): { db: DB; sql: ReturnType<typeof postgres> } {
  const ssl: boolean | undefined = cfg.db.ssl_mode === "require" ? true : undefined;

  const sql = postgres({
    host: cfg.db.host,
    port: cfg.db.port,
    user: cfg.db.user,
    password: cfg.db.password,
    database: cfg.db.name,
    ssl,
    max: cfg.db.max_open_conns,
    // Both of these are seconds. idle_timeout previously received a value in
    // minutes, so a 60-minute setting silently became a 60-second one.
    idle_timeout: cfg.db.idle_timeout_seconds,
    max_lifetime: cfg.db.conn_max_lifetime_minutes * 60,
  });

  return { db: drizzle(sql, { schema }), sql };
}
