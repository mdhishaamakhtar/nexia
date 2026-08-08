import { describe, test, expect, afterEach, inject } from "vitest";
import postgres from "postgres";
import pino from "pino";
import { resolveMigrationsFolder, runMigrations } from "../../src/db/migrate";

const logger = pino({ level: "silent" });
const open: Array<ReturnType<typeof postgres>> = [];

afterEach(async () => {
  await Promise.allSettled(open.splice(0).map((sql) => sql.end({ timeout: 5 })));
});

function track(sql: ReturnType<typeof postgres>) {
  open.push(sql);
  return sql;
}

/** Creates a brand-new empty database on the container and connects to it. */
async function freshDatabase(name: string): Promise<ReturnType<typeof postgres>> {
  const adminUrl = inject("databaseUrl");
  const admin = track(postgres(adminUrl, { max: 1 }));
  await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);
  await admin.unsafe(`CREATE DATABASE "${name}"`);

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return track(postgres(url.toString(), { max: 1 }));
}

async function tableNames(sql: ReturnType<typeof postgres>): Promise<string[]> {
  const rows = await sql<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  return rows.map((r) => r.tablename).sort();
}

describe("resolveMigrationsFolder", () => {
  test("locates the migrations folder from this module's directory", () => {
    expect(resolveMigrationsFolder()).toMatch(/apps[/\\]api[/\\]drizzle$/);
  });

  test("throws a clear error when there is no migrations folder above", () => {
    expect(() => resolveMigrationsFolder("/")).toThrow(/could not locate/);
  });
});

describe("runMigrations", () => {
  test("builds the whole schema on an empty database", async () => {
    const sql = await freshDatabase("migrate_fresh");
    await runMigrations(sql, logger);

    const tables = await tableNames(sql);
    expect(tables).toContain("users");
    expect(tables).toContain("profiles");
    expect(tables).toContain("profile_embeddings");
    expect(tables).toContain("favorite_memories");

    const [ext] = await sql<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    expect(ext?.extname).toBe("vector");

    // pronouns arrives in the third migration; its presence proves the whole
    // journal ran, not just the initial snapshot.
    const [col] = await sql<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'profiles' AND column_name = 'pronouns'
    `;
    expect(col?.column_name).toBe("pronouns");
  });

  test("is idempotent", async () => {
    const sql = await freshDatabase("migrate_twice");
    await runMigrations(sql, logger);
    const first = await tableNames(sql);

    await runMigrations(sql, logger);
    expect(await tableNames(sql)).toEqual(first);
  });

  test("baselines a database golang-migrate previously owned", async () => {
    const sql = await freshDatabase("migrate_baseline");

    // Stand in for the pre-drizzle world: the schema already exists, but the
    // drizzle journal does not and a golang-migrate version table does.
    await runMigrations(sql, logger);
    await sql.unsafe(`DROP SCHEMA drizzle CASCADE`);
    await sql.unsafe(`CREATE TABLE schema_migrations (version bigint, dirty boolean)`);
    await sql.unsafe(`INSERT INTO schema_migrations VALUES (5, false)`);

    await runMigrations(sql, logger);

    const rows = await sql<Array<{ hash: string }>>`
      SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id
    `;
    // One journal row per migration file, recorded without re-running them.
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(await tableNames(sql)).toContain("profiles");
  });

  test("refuses to baseline from a dirty golang-migrate state", async () => {
    const sql = await freshDatabase("migrate_dirty");
    await runMigrations(sql, logger);
    await sql.unsafe(`DROP SCHEMA drizzle CASCADE`);
    await sql.unsafe(`CREATE TABLE schema_migrations (version bigint, dirty boolean)`);
    await sql.unsafe(`INSERT INTO schema_migrations VALUES (5, true)`);

    // A dirty marker means the old tool failed part-way. Baselining would
    // declare that mess complete, so it must not happen — drizzle then tries to
    // apply migration 0 over existing tables and fails loudly instead.
    await expect(runMigrations(sql, logger)).rejects.toThrow();
  });

  test("does not baseline from a version older than the drizzle cutover", async () => {
    const sql = await freshDatabase("migrate_old_version");
    await runMigrations(sql, logger);
    await sql.unsafe(`DROP SCHEMA drizzle CASCADE`);
    await sql.unsafe(`CREATE TABLE schema_migrations (version bigint, dirty boolean)`);
    await sql.unsafe(`INSERT INTO schema_migrations VALUES (2, false)`);

    await expect(runMigrations(sql, logger)).rejects.toThrow();
  });

  test("ignores an empty golang-migrate version table", async () => {
    const sql = await freshDatabase("migrate_empty_version");
    await sql.unsafe(`CREATE TABLE schema_migrations (version bigint, dirty boolean)`);

    // No row means nothing to baseline from, so the migrations simply run.
    await runMigrations(sql, logger);
    expect(await tableNames(sql)).toContain("profiles");
  });
});
