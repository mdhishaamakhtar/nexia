/**
 * Drops and recreates the E2E database before the API starts, so every run
 * begins empty and the API's own migrations build the schema. Run by the
 * API's `webServer` command in `playwright.config.ts`.
 */
import postgres from "postgres";
import { E2E_DATABASE, POSTGRES_URL } from "./env.ts";

const sql = postgres(`${POSTGRES_URL}/postgres`, { onnotice: () => {} });
try {
  await sql.unsafe(`DROP DATABASE IF EXISTS ${E2E_DATABASE} WITH (FORCE)`);
  await sql.unsafe(`CREATE DATABASE ${E2E_DATABASE}`);
} finally {
  await sql.end();
}
