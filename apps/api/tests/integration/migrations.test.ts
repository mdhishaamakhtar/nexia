import { describe, test, expect, afterEach, inject } from "vitest";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    expect(tables).not.toContain("favorite_memories");

    const [ext] = await sql<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    expect(ext?.extname).toBe("vector");

    // The list columns arrive late in the journal; their presence proves the
    // whole journal ran, not just the initial snapshot.
    const [col] = await sql<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'profiles' AND column_name = 'tags'
    `;
    expect(col?.column_name).toBe("tags");
  });

  test("is idempotent", async () => {
    const sql = await freshDatabase("migrate_twice");
    await runMigrations(sql, logger);
    const first = await tableNames(sql);

    await runMigrations(sql, logger);
    expect(await tableNames(sql)).toEqual(first);
  });
});

/** A copy of the migrations folder whose journal stops after `count` entries. */
function migrationsUpTo(count: number): string {
  const dir = join(mkdtempSync(join(tmpdir(), "nexia-migrations-")), "drizzle");
  cpSync(resolveMigrationsFolder(), dir, { recursive: true });
  const journalPath = join(dir, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: unknown[] };
  journal.entries = journal.entries.slice(0, count);
  writeFileSync(journalPath, JSON.stringify(journal));
  return dir;
}

describe("moving list fields onto the profile", () => {
  test("carries every existing row across, in order, and tidies what it finds", async () => {
    const sql = await freshDatabase("migrate_backfill");
    // The schema as it was before the list columns existed.
    await runMigrations(sql, logger, migrationsUpTo(3));

    const [user] = await sql<Array<{ id: string }>>`
      INSERT INTO users (email, password, email_verified) VALUES ('Mixed.Case@Example.com', 'x', true) RETURNING id
    `;
    // Two accounts that differ only by case: lowering the first would collide.
    await sql`INSERT INTO users (email, password) VALUES ('Taken@Example.com', 'x'), ('taken@example.com', 'x')`;
    const [profile] = await sql<Array<{ id: string }>>`
      INSERT INTO profiles (user_id, full_name, relationship_type, notes, bio, zodiac_sign)
      VALUES (${user!.id}, 'Old Friend', 'Friend', 'n', NULL, 'Leo') RETURNING id
    `;
    const pid = profile!.id;
    await sql`INSERT INTO tags (profile_id, tag) VALUES (${pid}, ' second'), (${pid}, ''), (${pid}, 'third')`;
    await sql`INSERT INTO quotes (profile_id, quote) VALUES (${pid}, 'said this')`;
    await sql`INSERT INTO favorite_memories (profile_id, memory) VALUES (${pid}, 'm1'), (${pid}, 'm2')`;
    await sql`INSERT INTO top_songs (profile_id, name, artist) VALUES (${pid}, 'One', 'A'), (${pid}, '', 'Only Artist')`;
    await sql`INSERT INTO associated_songs (profile_id, name, artist) VALUES (${pid}, 'Theme', NULL)`;
    await sql`INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (${user!.id}, 'plain', now() + interval '1 hour')`;

    await runMigrations(sql, logger);

    const [row] = await sql<
      Array<{
        tags: string[];
        quotes: string[];
        favorite_memories: string[];
        top_songs: unknown;
        associated_song: unknown;
        bio: string;
        revision: number;
      }>
    >`SELECT tags, quotes, favorite_memories, top_songs, associated_song, bio, revision FROM profiles WHERE id = ${pid}`;

    expect(row!.tags).toEqual(["second", "third"]);
    expect(row!.quotes).toEqual(["said this"]);
    expect(row!.favorite_memories).toEqual(["m1", "m2"]);
    expect(row!.top_songs).toEqual([
      { name: "One", artist: "A" },
      { name: "Only Artist", artist: "" },
    ]);
    expect(row!.associated_song).toEqual({ name: "Theme", artist: "" });
    expect(row!.bio).toBe("");
    expect(row!.revision).toBe(1);

    const emails = await sql<Array<{ email: string }>>`SELECT email FROM users ORDER BY id`;
    // Lower-cased, except where that would collide with another account.
    expect(emails.map((e) => e.email)).toEqual([
      "mixed.case@example.com",
      "Taken@Example.com",
      "taken@example.com",
    ]);

    expect(await sql`SELECT 1 FROM password_reset_tokens`).toHaveLength(0);
    const tables = await tableNames(sql);
    for (const gone of ["tags", "quotes", "top_songs", "associated_songs", "favorite_memories"]) {
      expect(tables).not.toContain(gone);
    }
    const [zodiac] = await sql`
      SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'zodiac_sign'
    `;
    expect(zodiac).toBeUndefined();
  });
});
