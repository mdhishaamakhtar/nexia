import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type postgres from "postgres";
import type { Logger } from "../logging/logger";
import * as schema from "./schema";

const MIGRATIONS_FOLDER = "drizzle";

export async function runMigrations(sql: ReturnType<typeof postgres>, log: Logger): Promise<void> {
  const db = drizzle(sql, { schema });

  const [gm] = await sql<Array<Record<string, unknown>>>`
    SELECT to_regclass('public.schema_migrations') AS t
  `;
  const [dz] = await sql<Array<Record<string, unknown>>>`
    SELECT to_regclass('drizzle.__drizzle_migrations') AS t
  `;

  if (gm?.t && !dz?.t) {
    const [row] = await sql<Array<Record<string, unknown>>>`
      SELECT version, dirty FROM schema_migrations LIMIT 1
    `;
    if (row && !row.dirty && Number(row.version) >= 5) {
      await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
      await sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint
      )`;

      const journalModule = await import("../../drizzle/meta/_journal.json", {
        assert: { type: "json" },
      });
      const journal = journalModule.default as {
        entries: Array<{ idx: number; version: string; when: number; tag: string; breakpoints: boolean }>;
      };

      const { createHash } = await import("node:crypto");

      for (const entry of journal.entries) {
        const migrationFile = Bun.file(`drizzle/${entry.tag}.sql`);
        const content = await migrationFile.text();
        const hash = createHash("sha256").update(content).digest("hex");

        await sql`
          INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
          VALUES (${hash}, ${entry.when})
        `;
      }
      log.info("baselined existing golang-migrate schema into drizzle journal");
    }
  }

  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  log.info("database migrations complete");
}
