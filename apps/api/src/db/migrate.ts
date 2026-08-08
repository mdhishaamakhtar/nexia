import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type postgres from "postgres";
import type { Logger } from "../logging/logger";
import * as schema from "./schema";

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

/**
 * Locates `apps/api/drizzle` by walking up from this module. The folder must not
 * be resolved against `process.cwd()`: migrations run from the API root in dev,
 * from `dist/` in the container, and from the repo root under the test runner,
 * and a relative path is only correct for the first of those.
 */
export function resolveMigrationsFolder(from = import.meta.dirname): string {
  let dir = from;
  for (;;) {
    const candidate = join(dir, "drizzle");
    if (existsSync(join(candidate, "meta", "_journal.json"))) return candidate;

    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`could not locate a drizzle migrations folder above ${resolve(from)}`);
    }
    dir = parent;
  }
}

/**
 * Baselines a database that golang-migrate previously owned, so drizzle does not
 * try to re-apply schema that already exists. Only runs when the old
 * `schema_migrations` table is present and drizzle's own journal is not.
 */
async function baselineGolangMigrate(
  sql: ReturnType<typeof postgres>,
  migrationsFolder: string,
  log: Logger
): Promise<void> {
  const [row] = await sql<Array<Record<string, unknown>>>`
    SELECT version, dirty FROM schema_migrations LIMIT 1
  `;
  if (!row || row.dirty || Number(row.version) < 5) return;

  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
  await sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint
  )`;

  const journalRaw = await readFile(join(migrationsFolder, "meta", "_journal.json"), "utf8");
  const journal = JSON.parse(journalRaw) as { entries: JournalEntry[] };

  for (const entry of journal.entries) {
    const content = await readFile(join(migrationsFolder, `${entry.tag}.sql`), "utf8");
    const hash = createHash("sha256").update(content).digest("hex");

    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${hash}, ${entry.when})
    `;
  }
  log.info("baselined existing golang-migrate schema into drizzle journal");
}

export async function runMigrations(
  sql: ReturnType<typeof postgres>,
  log: Logger,
  migrationsFolder = resolveMigrationsFolder()
): Promise<void> {
  const db = drizzle(sql, { schema });

  const [gm] = await sql<Array<Record<string, unknown>>>`
    SELECT to_regclass('public.schema_migrations') AS t
  `;
  const [dz] = await sql<Array<Record<string, unknown>>>`
    SELECT to_regclass('drizzle.__drizzle_migrations') AS t
  `;

  if (gm?.t && !dz?.t) {
    await baselineGolangMigrate(sql, migrationsFolder, log);
  }

  await migrate(db, { migrationsFolder });
  log.info("database migrations complete");
}
