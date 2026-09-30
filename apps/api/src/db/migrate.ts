import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Logger } from "../logging/logger";
import type { SQL } from "./client";

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

export async function runMigrations(
  sql: SQL,
  log: Logger,
  migrationsFolder = resolveMigrationsFolder()
): Promise<void> {
  await migrate(drizzle(sql), { migrationsFolder });
  log.info("database migrations complete");
}
