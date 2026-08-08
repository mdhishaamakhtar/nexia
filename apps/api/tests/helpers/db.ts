import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { inject } from "vitest";
import * as schema from "../../src/db/schema";
import type { DB } from "../../src/db/client";

let handle: { db: DB; sql: ReturnType<typeof postgres> } | null = null;

/**
 * One connection pool per worker process, reused by every harness in that
 * worker. Opening a fresh pool per test would dominate the runtime of an
 * otherwise millisecond-scale suite.
 */
export function getTestDb(): { db: DB; sql: ReturnType<typeof postgres> } {
  if (!handle) {
    const sql = postgres(inject("databaseUrl"), { max: 5 });
    handle = { db: drizzle(sql, { schema }), sql };
  }
  return handle;
}

export async function closeTestDb(): Promise<void> {
  if (handle) {
    await handle.sql.end({ timeout: 5 });
    handle = null;
  }
}

let tableNames: string[] | null = null;

/**
 * Wipes every table in the public schema between tests. Discovered from the
 * catalogue rather than hard-coded so a new table can never silently start
 * leaking rows across cases. Drizzle's own journal lives in the `drizzle`
 * schema and is deliberately left alone.
 */
export async function truncateAll(): Promise<void> {
  const { sql } = getTestDb();

  if (!tableNames) {
    const rows = await sql<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    tableNames = rows.map((r) => r.tablename);
  }
  if (tableNames.length === 0) return;

  const list = tableNames.map((t) => `"${t}"`).join(", ");
  await sql.unsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
