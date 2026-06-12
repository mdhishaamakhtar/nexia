# Nexia Go → TypeScript Monorepo Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Go backend with a Bun + Hono + Drizzle TypeScript backend in a Bun-workspaces monorepo with shared zod API contracts, upgrade chat to a streaming tool-using agent (OpenCode Go `deepseek-v4-pro` + Gemini embeddings, both via Vercel AI SDK), achieve test parity, and cut over Railway in place.

**Architecture:** Constructor-style DI mirroring the Go layout (controllers → services → repositories), sentinel-error taxonomy mapped to the identical HTTP error envelope, BullMQ in-process worker replacing Asynq, drizzle-kit migrations with a golang-migrate baseline detector so the prod DB needs zero data migration. Contracts live in `@nexia/shared` (zod v4) and are consumed by both apps.

**Tech Stack:** Bun 1.x, Hono 4, Drizzle ORM (postgres-js), BullMQ + ioredis, jose (HS256), pino, yaml, Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/openai-compatible`, `@ai-sdk/react`), zod 4, testcontainers, Resend SDK, Next.js 16 (unchanged).

**Authoritative porting source:** the Go code in `backend/` (kept in git history; deleted in Task 9). Every port step names its Go source file. Behavior parity is the requirement; Go tests define the cases.

**Spec:** `docs/superpowers/specs/2026-06-13-typescript-migration-design.md`

---

## Locked contract facts (from the Go code — do not deviate)

- Error envelope: `{ "error": { "code": string, "message": string } }`. Success returns data directly.
- Codes used: `VALIDATION_ERROR` 400, `BAD_REQUEST` 400, `UNAUTHORIZED` 401, `ACCOUNT_NOT_FOUND` 401, `EMAIL_NOT_VERIFIED` 403, `CSRF_TOKEN_MISSING`/`CSRF_TOKEN_INVALID` 403, `NOT_FOUND` 404, `EMAIL_CONFLICT` 409, `RATE_LIMITED` 429, `AI_UNAVAILABLE` 503, `SERVER_ERROR` 500.
- Routes (all under `/api/v1`): healthz, readyz, auth/signup, auth/login, auth/verify-email (GET ?token=), auth/me, auth/logout, auth/forgot-password, auth/reset-password, chat, profiles CRUD+list, swagger.
- Responses: signup 201 `{message}`; login 200 `{token}` + cookies; verify-email 200 `{message}`; me 200 `{authenticated, user_id}`; logout 200 `{message}`; forgot/reset 200 `{message}`; create profile 201 `{id}`; get profile 200 (full profile JSON); list 200 `{data, total, page, limit}`; update 200 `{message}`; delete 200 `{message}`.
- Profile JSON: snake_case (`full_name`, `relationship_type`, `zodiac_sign`, `birthday` "YYYY-MM-DD" or null, `political_views: [{id, profile_id, view}]`, `top_songs: [{id, profile_id, name, artist}]`, `associated_song: {profile_id, name, artist} | null`, timestamps ISO).
- Cookies: `nexia_token` (httpOnly, Secure, SameSite=None, path /, domain from config, maxAge = jwt_expiry_minutes*60); `nexia_csrf` (same but NOT httpOnly). Logout clears both (maxAge -1/0).
- JWT: HS256, claims `{user_id, iat, exp}`, expiry from `server.jwt_expiry_minutes` (fallback 1440 min). Same secret → sessions survive cutover.
- CSRF: double-submit, only for cookie-authenticated POST/PUT/PATCH/DELETE; bearer requests exempt; constant-time compare of `nexia_csrf` cookie vs `X-CSRF-Token` header.
- Auth middleware: Bearer header takes precedence; else `nexia_token` cookie; validates JWT; then verifies user exists via `FindByID` → else 401 "User not found".
- Rate limits: token bucket per `path:clientIP`, refill `requests/windowSeconds`, capacity `burst` (clamped ≤ requests), stale entries evicted after 10×window. Auth family defaults 10/10s burst 10; chat 10/60s burst 3 (from yaml).
- Auth service rules: signup validates email (must parse) + password ≥ 6; duplicate email → EMAIL_CONFLICT; verification token 64-hex, 24 h expiry; login: wrong password → UNAUTHORIZED, missing account → ACCOUNT_NOT_FOUND, unverified → EMAIL_NOT_VERIFIED; forgot-password always 200 (enumeration-safe), token 15 min; reset validates ≥ 6, single-use, expiry → NOT_FOUND. Email send failures are logged, never fail the request.
- Profile service rules: top songs ≤ 3 → VALIDATION_ERROR "cannot have more than 3 top songs"; zodiac always derived from birthday (null birthday → null zodiac); list clamps page ≥ 1, limit default 10, max 100; delete removes DB row first, then enqueues vector deletion.
- Embedding pipeline: profile create/update → enqueue `task:embedding` `{profile_id}`; delete → `task:deletion`. Worker: load profile (no user guard) → flatten text (see `buildEmbeddingText` in `backend/internal/services/embedding_service.go`) → embed (3072 dims) → upsert into `profile_embeddings` with full profile JSON payload. Profile vanished → skip retry. Embedding text format must match Go exactly (sync tool re-embeds consistently).
- RAG search SQL: `SELECT profile_id, 1 - (embedding <=> $vec) AS score, payload FROM profile_embeddings WHERE user_id = $uid ORDER BY embedding <=> $vec LIMIT $n`.
- Config: yaml `config/{APP_ENV|local}.yaml` + `NEXIA_*` env overrides (dots→underscores, e.g. `NEXIA_SERVER_JWT_SECRET`); `server.cors_origins` env value is comma-separated. Defaults: run_migrations true, pool settings as in Go.
- Email: Resend; verification link `{app_base_url}/verify-email/confirm?token=...`; reset email contains token + link `{app_base_url}/reset-password`; HTML templates in `backend/internal/email/templates.go` (copy verbatim). Disabled (no key) → log and return success.
- DB schema: see `backend/migrations/*.up.sql` — five migrations ending at: users(email…), profiles(+notes), 9 child tables, profile_embeddings vector(3072), password_reset_tokens, email_verification_tokens. No vector index (3072 > 2000 HNSW limit). golang-migrate tracking table: `schema_migrations(version bigint, dirty boolean)` at version 5 in prod.

---

### Task 0: Branch + verify Go suite green (baseline)

- [ ] `git checkout -b claude/ts-migration-001`
- [ ] `cd backend && go test -count=1 ./...` — record pass (baseline for parity claims).

### Task 1: Monorepo scaffold + move frontend

**Files:** Create `package.json` (root), `tsconfig.base.json`, `.gitignore` additions; `git mv frontend apps/web`.

- [ ] Root `package.json`:

```json
{
  "name": "nexia",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "packageManager": "bun@<installed version>"
}
```

- [ ] `tsconfig.base.json`: strict, `"target": "ES2023"`, `"module": "Preserve"`, `"moduleResolution": "bundler"`, `"verbatimModuleSyntax": true`, `noUncheckedIndexedAccess`, `types: ["bun-types"]` only in api.
- [ ] `mkdir -p apps packages && git mv frontend apps/web`. Update `apps/web/package.json` name → `"web"`.
- [ ] `bun install` at root (creates single lockfile; delete `apps/web/bun.lock` if present).
- [ ] Verify: `cd apps/web && bun run build` passes (Next may need `outputFileTracingRoot` set to repo root in `next.config.ts` to silence workspace-root warning — set it).
- [ ] Commit: `chore: restructure into bun workspaces monorepo (frontend → apps/web)`.

### Task 2: `packages/shared` contracts

**Files:** Create `packages/shared/package.json` (`"name": "@nexia/shared"`, `"exports": {".": "./src/index.ts"}`), `src/index.ts`, `src/enums.ts`, `src/errors.ts`, `src/auth.ts`, `src/profile.ts`, `src/chat.ts`, colocated `*.test.ts`.

- [ ] `enums.ts`: `RELATIONSHIP_TYPES = ['Friend','Family','Colleague','Classmate','Crush','Ex','Mentor','Other'] as const`, `ZODIAC_SIGNS = [...12] as const`, zod enums + inferred types.
- [ ] `errors.ts`: `errorResponseSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) })`, `ErrorCode` union of the locked codes.
- [ ] `auth.ts` (zod, snake_case): `signupRequestSchema {email: z.string().min(1), password: z.string().min(1)}` (controller-level required-only; service enforces semantics, matching Go binding), `loginRequestSchema`, `forgotPasswordRequestSchema`, `resetPasswordRequestSchema {token, new_password}`, response schemas: `messageResponseSchema {message}`, `loginResponseSchema {token}`, `authSessionSchema {authenticated: z.boolean(), user_id: z.number()}`.
- [ ] `profile.ts`: child schemas (`tagSchema {id, profile_id, tag}` etc. — ids optional+defaulted on input, present on output), `profileInputSchema` (everything optional except nothing — Go binds the whole model with no required tags; service requires nothing beyond top-songs limit; DB requires `full_name` + valid `relationship_type`, so input schema: `full_name: z.string().min(1).max(150)`, `relationship_type: relationshipTypeSchema`, `birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish()`, rest optional strings/arrays, `zodiac_sign` accepted but ignored server-side), `profileSchema` (full output incl. `id, user_id, created_at, updated_at, zodiac_sign`), `profileListResponseSchema {data, total, page, limit}`, `createProfileResponseSchema {id}`, `listProfilesQuerySchema {page?, limit?, search?, relationship_type?}`.
- [ ] `chat.ts`: agent tool input schemas (used by both the agent definition and the UI for rendering tool chips): `ragSearchInputSchema {query, limit?}`, `searchProfilesInputSchema`, `getProfileInputSchema {id}`, `createProfileToolInputSchema` (= profileInputSchema), `updateProfileToolInputSchema {id, profile}`; `CHAT_TOOL_NAMES` const.
- [ ] Tests (`bun test packages/shared`): valid/invalid parse cases per schema, incl. birthday format rejection, relationship enum rejection, >3 top songs allowed at schema level (service enforces).
- [ ] Commit: `feat(shared): add @nexia/shared API contract schemas`.

### Task 3: apps/api scaffold + config loader

**Files:** Create `apps/api/package.json`, `tsconfig.json`, `config/local.yaml`, `config/prod.yaml`, `src/config/config.ts`, `src/config/config.test.ts`, `src/logging/logger.ts`.

- [ ] `apps/api/package.json` deps: `hono`, `drizzle-orm`, `postgres`, `bullmq`, `ioredis`, `jose`, `pino`, `yaml`, `zod`, `ai`, `@ai-sdk/google`, `@ai-sdk/openai-compatible`, `resend`, `@nexia/shared: workspace:*`; dev: `drizzle-kit`, `@types/bun` or `bun-types`, `testcontainers`, `@testcontainers/postgresql`, `@testcontainers/redis`, `pino-pretty`. Scripts: `dev: bun --watch src/index.ts`, `start: bun src/index.ts`, `test`, `test:unit: bun test src`, `test:integration: bun test tests/integration`, `sync: bun src/scripts/sync.ts`, `db:generate: drizzle-kit generate`.
  *Check current package versions/APIs with context7 before pinning (especially AI SDK major).* 
- [ ] Copy `config/local.yaml` + `config/prod.yaml` from `backend/config/` verbatim, then add the AI fields:

```yaml
ai:
  gemini_api_key: ""
  redis_url: "127.0.0.1:6379"
  opencode_api_key: ""        # NEXIA_AI_OPENCODE_API_KEY
  opencode_base_url: "https://opencode.ai/zen/go/v1"
  chat_model: "deepseek-v4-pro"   # NEXIA_AI_CHAT_MODEL
```

- [ ] `src/config/config.ts` — port of `backend/internal/config/config.go`. zod schema mirroring the Go structs (same yaml keys, same defaults: `db.run_migrations` true, `max_idle_conns` 10, `max_open_conns` 50, `conn_max_lifetime_minutes` 60). Loader:

```ts
const ENV_PREFIX = "NEXIA_";

function applyEnvOverrides(raw: Record<string, unknown>): void {
  // NEXIA_SERVER_JWT_SECRET → server.jwt_secret. Section is the first token;
  // the rest joins back with underscores (keys themselves contain underscores).
  for (const [name, value] of Object.entries(process.env)) {
    if (!name.startsWith(ENV_PREFIX) || value === undefined) continue;
    const [section, ...rest] = name.slice(ENV_PREFIX.length).toLowerCase().split("_");
    if (!section || rest.length === 0) continue;
    const sectionObj = ((raw[section] ??= {}) as Record<string, unknown>);
    sectionObj[rest.join("_")] = coerce(section, rest.join("_"), value);
  }
}
// coerce: cors_origins → comma-split array; numeric fields → Number; booleans → "true"/"false".
export async function loadConfig(configDir = "config"): Promise<Config> {
  const env = process.env.APP_ENV ?? "local";
  const raw = YAML.parse(await Bun.file(`${configDir}/${env}.yaml`).text());
  applyEnvOverrides(raw);
  return configSchema.parse(raw);
}
```

- [ ] `src/logging/logger.ts`: pino JSON logger, `logger.child({ component })` replaces zap `Named()`. Level from `LOG_LEVEL` env, default info.
- [ ] Tests port `backend/internal/config/config_test.go`: loads local.yaml, env override wins (set `NEXIA_SERVER_JWT_SECRET`, `NEXIA_DB_PASSWORD`, `NEXIA_SERVER_CORS_ORIGINS="https://a.com,https://b.com"` → array), defaults applied, missing file errors.
- [ ] Commit: `feat(api): scaffold Bun+Hono app with config loader`.

### Task 4: DB layer — drizzle schema, migrations, baseline runner

**Files:** Create `apps/api/src/db/schema.ts`, `src/db/client.ts`, `src/db/migrate.ts`, `drizzle.config.ts`, `drizzle/0000_init.sql` (generated), tests in integration suite (Task 8).

- [ ] `schema.ts`: tables exactly matching the final migrated state (see Locked facts). Key snippets:

```ts
import { pgTable, bigserial, bigint, varchar, text, boolean, date, timestamp, jsonb, vector, index, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().default(""),
  emailVerified: boolean("email_verified").notNull().default(false),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (t) => [uniqueIndex("idx_users_email").on(t.email)]);

export const profiles = pgTable("profiles", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 150 }).notNull(),
  // … bio, profession, longTermGoals, relationshipType varchar(50) notNull,
  // birthday: date("birthday", { mode: "string" }),  ← "YYYY-MM-DD" strings
  // zodiacSign varchar(50), musicPreference, favoriteMovie/Book varchar(200),
  // favoriteMemory text, notes text notNull default '', timestamps
});
// child tables tags/political_views/food_restrictions/movie_genres/book_genres/
// hangout_places/quotes/top_songs (bigserial id, profile_id FK cascade, value col)
// associated_songs (profile_id PK FK cascade, name, artist)
export const profileEmbeddings = pgTable("profile_embeddings", {
  profileId: bigint("profile_id", { mode: "number" }).primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" }).notNull(),
  embedding: vector("embedding", { dimensions: 3072 }).notNull(),
  payload: jsonb("payload").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (t) => [index("idx_profile_embeddings_user_id").on(t.userId)]);
// password_reset_tokens + email_verification_tokens per migrations
```

  CHECK constraints for relationship_type/zodiac and the `LOWER(full_name)` index are added via raw SQL in the generated migration if drizzle-kit can't express them — edit `0000_init.sql` once before first commit (it is the *initial* migration; editing pre-merge is allowed).
- [ ] `drizzle.config.ts`: `dialect: "postgresql"`, schema path, out `./drizzle`. Run `bunx drizzle-kit generate` → `drizzle/0000_init.sql`. Prepend `CREATE EXTENSION IF NOT EXISTS vector;` and verify generated SQL ≡ cumulative Go migrations (diff mentally against `backend/migrations/`).
- [ ] `src/db/client.ts`: postgres-js client from config (host/port/user/password/db/ssl `disable→undefined, require→'require'`, max = max_open_conns, idle_timeout, max_lifetime), export `createDb(cfg)` returning `{ db: drizzle(client, { schema }), sql: client }`.
- [ ] `src/db/migrate.ts` — the baseline-aware runner:

```ts
export async function runMigrations(sql: postgres.Sql, log: Logger): Promise<void> {
  // Baseline: prod DB was migrated by golang-migrate (schema_migrations.version = 5).
  // If that table exists at version >= 5 and drizzle has no journal rows yet,
  // record the initial drizzle migration as applied without executing it.
  const [gm] = await sql`SELECT to_regclass('public.schema_migrations') AS t`;
  const [dz] = await sql`SELECT to_regclass('drizzle.__drizzle_migrations') AS t`;
  if (gm?.t && !dz?.t) {
    const [row] = await sql`SELECT version, dirty FROM schema_migrations LIMIT 1`;
    if (row && !row.dirty && Number(row.version) >= 5) {
      await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
      await sql`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`;
      for (const entry of journal.entries) {            // drizzle/meta/_journal.json
        const hash = /* sha256 of migration file content, matching drizzle migrator's hash */;
        await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
                  VALUES (${hash}, ${entry.when})`;
      }
      log.info("baselined existing golang-migrate schema into drizzle journal");
    }
  }
  await migrate(drizzle(sql), { migrationsFolder: resolveMigrationsDir() });
}
```

  **Verify drizzle's hash scheme against the installed drizzle-orm source before implementing** (it stores a sha256 of the migration SQL text; confirm exact input). Integration test (Task 8) covers both paths: fresh DB and simulated-prod DB.
- [ ] Commit: `feat(api): drizzle schema, client, and baseline-aware migration runner`.

### Task 5: utils + middleware (TDD, port Go tests)

**Files:** Create `src/services/errors.ts`, `src/utils/{jwt,csrf,respond}.ts`, `src/middleware/{auth,csrf,rate-limit,auth-rate-limit,chat-rate-limit,request-context}.ts`, colocated `*.test.ts`. Go sources: `backend/internal/utils/*.go`, `backend/internal/middleware/*.go` (+ their `_test.go` files define the cases).

- [ ] `errors.ts`: `class ServiceError extends Error { constructor(public kind: ErrorKind, message?) }` with kinds `not_found | unauthorized | account_not_found | validation | ai_unavailable | email_not_verified | email_conflict`; helper constructors (`errValidation(msg)` …). `respondWithServiceError(c, err)` maps to the locked code/status table; unknown → 500 SERVER_ERROR with `err.message`.
- [ ] `utils/jwt.ts` (jose): `generateToken(userId, cfg)` HS256 `{user_id}` + iat/exp (fallback 1440 min); `validateToken(token, cfg)` returns `{ userId }`, throws on invalid/expired. Test: round-trip, wrong secret fails, expired fails, user_id preserved.
- [ ] `utils/csrf.ts`: `generateCsrfToken()` 32 random bytes hex; `utils/respond.ts`: `respondError(c, status, code, message)` building the envelope.
- [ ] `middleware/request-context.ts`: pino per-request log (method, path, status, duration) + recovery (catch → 500 SERVER_ERROR JSON) — port semantics of `request_context.go`.
- [ ] `middleware/auth.ts`: port `auth_middleware.go` exactly (precedence, malformed Bearer → 401 "Invalid authorization header format", cookie fallback, user existence check, sets `userId` + `authMethod` on context `c.set`). Hono: read cookie via `getCookie(c, "nexia_token")`.
- [ ] `middleware/csrf.ts`: port `csrf_middleware.go` (method filter, cookie-auth only, constant-time compare via `crypto.timingSafeEqual` on equal-length buffers — length mismatch → invalid).
- [ ] `middleware/rate-limit.ts`: token bucket engine port of `rate_limit.go` (continuous refill: `tokens = min(burst, tokens + elapsed*rate)`; key `path:ip`; ip from `x-forwarded-for` first value else conninfo; stale eviction 10×window; burst clamped ≤ requests). `auth-rate-limit.ts` / `chat-rate-limit.ts` wrap with the config fields + messages from their Go counterparts.
- [ ] Port all middleware unit tests (`middleware_test.go`, `additional_test.go`, `rate_limit_test.go`, `auth_rate_limit_test.go`, `chat_rate_limit_test.go`) using `app.request()` on a minimal Hono app with stubbed user lookup. Run `bun test apps/api/src` green.
- [ ] Commit: `feat(api): auth, CSRF, and rate-limit middleware with ported tests`.

### Task 6: repositories + email + queue

**Files:** Create `src/repositories/{user,password-reset,email-verification,profile,embedding}.ts`, `src/email/{email-service.ts,templates.ts}`, `src/queue/{types.ts,producer.ts,worker.ts}`, tests colocated (pure-logic parts) — DB-backed behavior covered in Task 8. Go sources: `backend/internal/repositories/*.go`, `backend/internal/email/*.go`, `backend/internal/queue/*.go`.

- [ ] Repositories return **contract-shaped objects** (`Profile` from `@nexia/shared`) via explicit row→contract mappers. Service-facing interfaces are defined in the service files (consuming side), mirroring Go convention.
- [ ] `user.ts`: create / findByEmail / findById / updatePassword / updateEmailVerified (set updated_at = now()). Not-found → return `null` (services translate to sentinels).
- [ ] Token repos: create / findByToken / markAsUsed.
- [ ] `profile.ts` — the careful one. Port semantics of `profile_repository.go`:
  - `create(profile)`: one transaction — insert parent, insert children, insert associated_song if present; return hydrated profile (with new ids).
  - `findById(id, userId)`, `findAll(page, limit, search, relationshipType, userId)`: `WHERE user_id` + `LOWER(full_name) LIKE LOWER('%s%')` + exact relationship filter; count + page; hydrate children with batched `inArray` selects (avoid N+1).
  - `update(profile)`: transaction — assert exists for user (else not-found); update parent; per child table: upsert rows with id (`onConflictDoUpdate`), insert id-less rows, then delete `profile_id = X AND id NOT IN (kept ids)` (no kept ids → delete all); associated_song: upsert or delete-if-null. Return hydrated profile.
  - `delete(id, userId)`: delete parent (cascade), report not-found if 0 rows.
  - `loadForEmbedding(profileId)`: hydrate without user guard.
- [ ] `embedding.ts`: port `embedding_repository.go` — `upsertProfile(profile, embedding)` (raw `onConflictDoUpdate`, payload = contract Profile JSON), `deleteProfile(profileId)`, `searchContext(userId, queryEmbedding, limit)` using the locked SQL (drizzle `sql` template + `cosineDistance` helper or raw).
- [ ] `email/templates.ts`: copy both HTML builders from `backend/internal/email/templates.go` verbatim (template strings). `email-service.ts`: port `email_service.go` — disabled mode logs + succeeds; URLs identical (`/verify-email/confirm?token=` URL-escaped; reset email gets token + `{base}/reset-password`).
- [ ] `queue/types.ts`: `QUEUE_NAME = "nexia-embedding"`, job names `"task:embedding"` / `"task:deletion"`, payload types `{ profileId: number }`. `producer.ts`: `EmbeddingQueueProducer` with `enqueueEmbeddingTask` / `enqueueDeletionTask` (BullMQ `Queue.add`, attempts 5, exponential backoff 5 s, removeOnComplete/Fail). Redis URL parsing: accept `host:port`, `redis://…`, `rediss://…` → ioredis options with `maxRetriesPerRequest: null`.
- [ ] `queue/worker.ts`: port `consumer.go` — BullMQ `Worker` dispatching by job name to `EmbeddingService`; profile-not-found → log + `UnrecoverableError` (skip retry); concurrency 2. Unit-test the handler dispatch with a fake service (port `queue_test.go` cases).
- [ ] Commit: `feat(api): drizzle repositories, resend email, bullmq queue`.

### Task 7: services (TDD — port Go unit tests first)

**Files:** Create `src/services/{auth-service,profile-service,zodiac,embedding-service}.ts` + colocated tests. Go sources + tests: `backend/internal/services/*`.

- [ ] `zodiac.ts`: `deriveZodiac(month, day)` — port the table exactly; `applyDerivedZodiac(profile)` (empty/undefined birthday → birthday null + zodiac null). Test: the full boundary table from `profile_service_test.go` (every cusp date both sides).
- [ ] `auth-service.ts`: port all five flows per Locked facts. Email validation: a pragmatic RFC-lite check matching Go's `mail.ParseAddress` for the tested cases (`x@y.z` ok; no-@, empty → invalid). bcrypt via `Bun.password` (`algorithm: "bcrypt", cost: 10`); **test verifies a Go-generated hash** `$2a$10$…` (generate one fixture from the Go repo before deleting it: `htpasswd -bnBC 10 "" password123` or a tiny Go script) round-trips with `Bun.password.verify`. Token = 32 random bytes hex.
- [ ] `profile-service.ts`: create/get/list/update/delete per Locked facts; queue nullable (skip enqueue when absent); enqueue failures logged, never thrown.
- [ ] `embedding-service.ts`: `embedProfile(profileId)` (load → buildEmbeddingText → generator → upsert; not-found → sentinel), `deleteEmbedding`, plus `buildEmbeddingText` ported **line-for-line** from Go (same labels, separators, quoting of quotes via `JSON.stringify`-style %q, date format "January 02, 2006" → `Intl`/manual "June 13, 2026").
- [ ] Port every case in `auth_service_test.go`, `profile_service_test.go`, `embedding_service_test.go`, `chat_service_test.go` (chat guards move to Task 8's agent service tests where applicable) using local fakes (`fakeUserRepo` etc.) per the Go `mock_services_test.go` pattern.
- [ ] Run `bun test apps/api/src` green. Commit: `feat(api): auth, profile, embedding services with ported unit tests`.

### Task 8: AI — embeddings client + Nexia Intel agent + chat endpoint

**Files:** Create `src/ai/{embeddings.ts,provider.ts,agent.ts,tools.ts,system-prompt.ts}`, `src/controllers/chat-controller.ts`, tests with AI SDK mock models. *First: pull current AI SDK docs via context7 (`ai`, `@ai-sdk/google`, `@ai-sdk/openai-compatible`, `@ai-sdk/react`) and use the current major's API names.*

- [ ] `embeddings.ts`:

```ts
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed } from "ai";

export function createEmbeddingGenerator(apiKey: string): EmbeddingGenerator {
  const google = createGoogleGenerativeAI({ apiKey });
  const model = google.textEmbedding("gemini-embedding-001");
  return {
    async generateEmbedding(text) {
      const { embedding } = await embed({
        model, value: text,
        providerOptions: { google: { outputDimensionality: 3072 } },
      });
      return embedding;            // number[3072] — assert length, throw otherwise
    },
  };
}
```

- [ ] `provider.ts`: `createChatModel(cfg)` → `createOpenAICompatible({ name: "opencode-go", baseURL: cfg.ai.opencodeBaseUrl, apiKey: cfg.ai.opencodeApiKey })(cfg.ai.chatModel)`. Nullable when key missing.
- [ ] `tools.ts`: factory `buildAgentTools({ userId, profileService, embeddingRepo, embeddingGenerator })` returning AI SDK `tool()` definitions with the `@nexia/shared` input schemas: `ragSearch` (embed → searchContext, map to `{profile_id, score, payload}`; Gemini missing → return `{ error: "semantic search unavailable" }` so the model falls back to text search), `searchProfiles`, `getProfile`, `listProfiles`, `createProfile`, `updateProfile` (both call ProfileService → same validation/zodiac/queue path; return the contract profile + id). Tool errors return messages, never throw the stream down.
- [ ] `system-prompt.ts`: Nexia Intel persona (markdown rules from `chat_service.go`) + agent rules: required fields for create (`full_name`, `relationship_type`); ask clarifying questions for missing/ambiguous details; before any create/update tool call, summarize intended changes and get explicit user confirmation in conversation; cite profiles by full name; never fabricate profile data.
- [ ] `agent.ts`: `ChatAgent.respond({ messages })` → guard (model missing → ServiceError ai_unavailable) → `streamText({ model, system, messages: convertToModelMessages(messages), tools, stopWhen: stepCountIs(10) })` → return result. `chat-controller.ts`: validate body `{messages: array}` non-empty (400 VALIDATION_ERROR), `result.toUIMessageStreamResponse()` piped through Hono.
- [ ] Tests: mock model (AI SDK test helpers) — 503 when unconfigured; tool-call round trip (mock model emits a `createProfile` tool call → service fake records call with userId scoping → final text); ragSearch degraded path. Port `chat_service_test.go` guard cases.
- [ ] Commit: `feat(api): Nexia Intel agent with streaming chat endpoint`.

### Task 9: controllers, routes, OpenAPI, bootstrap, sync script — then delete Go

**Files:** Create `src/controllers/{auth-controller,profile-controller}.ts`, `src/routes/routes.ts`, `src/openapi.ts`, `src/app.ts`, `src/index.ts`, `src/scripts/sync.ts`. Modify `docker-compose.yml`, `nexia.sh`, `CLAUDE.md`, root `README.md`. Create `apps/api/Dockerfile`, modify `apps/web/Dockerfile`. Delete `backend/`.

- [ ] Controllers: thin ports of the Go controllers (validate with shared schemas via `safeParse` → 400 VALIDATION_ERROR with zod message; cookie setting per Locked facts using `setCookie` from `hono/cookie`).
- [ ] `routes.ts`: port `routes.go` — CORS (origins from config, credentials, methods GET/POST/PUT/DELETE/OPTIONS, headers Origin/Content-Type/Authorization/X-CSRF-Token), healthz, readyz (2 s DB ping), route table with exact middleware order (auth → csrf → rate limit for chat).
- [ ] `openapi.ts`: build OpenAPI 3.1 doc from shared schemas (`z.toJSONSchema`) covering every route; serve at `/api/v1/swagger/doc.json`; Swagger UI (`@hono/swagger-ui` or static page) at `/api/v1/swagger`.
- [ ] `app.ts`: `buildApp(deps)` factory wiring everything (DI mirror of `backend/internal/app/app.go` + `cmd/server/main.go`): config → logger → db → migrate (if run_migrations) → repos → email → queue producer/worker (nil when redis/gemini unconfigured, per Go) → services → agent → controllers → router. `index.ts`: load config, build, `Bun.serve({ port, fetch: app.fetch, idleTimeout: 0 })`, graceful shutdown (SIGTERM: close worker, queue, db).
- [ ] `scripts/sync.ts`: port `cmd/sync/main.go` — iterate all profiles, enqueue embedding tasks.
- [ ] `apps/api/Dockerfile` (context = repo root):

```dockerfile
FROM oven/bun:1 AS deps
WORKDIR /repo
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile --filter api --filter @nexia/shared
FROM oven/bun:1
WORKDIR /repo
COPY --from=deps /repo/node_modules node_modules
COPY packages/shared packages/shared
COPY apps/api apps/api
WORKDIR /repo/apps/api
EXPOSE 8080
CMD ["bun", "src/index.ts"]
```

  (Adjust install flags to what current bun supports; verify image runs.)
- [ ] `apps/web/Dockerfile`: update for workspace (copy root lockfile + packages/shared; build arg `NEXT_PUBLIC_BACKEND_URL` unchanged).
- [ ] `docker-compose.yml`: backend/frontend build `context: .` + `dockerfile: apps/api/Dockerfile` / `apps/web/Dockerfile`; same env vars; add `NEXIA_AI_OPENCODE_API_KEY=${OPENCODE_API_KEY}`.
- [ ] `nexia.sh`: no service-name changes needed; verify.
- [ ] `git rm -r backend/` (after generating the bcrypt fixture in Task 7!). Rewrite `CLAUDE.md` for the new stack (layout, commands, conventions — keep the same structure).
- [ ] Commit: `feat(api): app wiring, routes, swagger, docker; remove Go backend`.

### Task 10: integration tests (testcontainers)

**Files:** Create `apps/api/tests/integration/{testkit.ts,health.test.ts,auth.test.ts,authorization.test.ts,profiles.test.ts,profiles-list.test.ts,async-worker.test.ts,chat.test.ts,migrations.test.ts,repositories.test.ts}`. Go sources: `backend/tests/integration/*_test.go` (read each from git history `git show HEAD~N:backend/tests/...` or before deletion).

- [ ] `testkit.ts`: start `pgvector/pgvector:pg17` + `redis:7-alpine` once per run (bun test `--preload` or lazy singleton); per-suite fresh database (`CREATE DATABASE`); helpers: `buildTestApp({ withQueue, fakeModel, fakeEmbedder, fakeEmail })`, `signupAndVerify(email)` (direct DB verify like Go's `testStore.verifyUserEmail`), authed fetch wrapper handling cookies + CSRF.
- [ ] Port every Go integration case: health (healthz/readyz), auth flows (signup→verify→login happy path; duplicate email 409; unverified login 403; wrong password 401; unknown account 401; forgot/reset cycle incl. expiry + reuse 404; enumeration-safe forgot), authorization (user A cannot read/update/delete user B's profile → 404), profiles (create with full associations → get returns identical contract shape; update prunes removed children, keeps updated ones, associated_song add/remove; >3 top songs 400; delete cascades), list (pagination, search case-insensitive substring, relationship filter, combined), async worker (create profile with fake embedder + real Redis → embedding row appears with payload; delete → row gone; deleted-profile task skips), chat (mock model end-to-end stream; 503 unconfigured; CSRF enforced on cookie auth), migrations (fresh apply idempotent; baseline path: hand-create v5 schema + `schema_migrations(version=5)` → runner baselines without error and tables intact).
- [ ] `bun test apps/api` — everything green.
- [ ] Commit: `test(api): full integration suite with testcontainers`.

### Task 11: frontend — shared types + agent chat UI

**Files:** Modify `apps/web/src/shared/types/*` (re-export from `@nexia/shared`), `apps/web/src/features/{auth,profiles}/api.ts` (type imports), rewrite `apps/web/src/app/(dashboard)/chat/page.tsx` + new `apps/web/src/features/chat/` components. Add deps `ai`, `@ai-sdk/react`.

- [ ] Replace local contract types with `@nexia/shared` imports (keep thin local aliases where names differ). `bun run build` still green.
- [ ] Chat rebuild: `useChat` with transport `DefaultChatTransport({ api: \`${BACKEND_URL}/api/v1/chat\`, credentials: "include", headers: () => ({ "X-CSRF-Token": readCsrfCookie() }) })` (match how `client.ts` reads the CSRF cookie today). Render UIMessage parts: text → markdown (existing ReactMarkdown styling); tool parts → status chips per tool (`ragSearch`→"Searching memories…", `searchProfiles`→"Searching profiles…", `createProfile` result → "✓ Created {full_name}" linking `/profiles/{id}`, same for update); error part → toast. Invalidate `["profiles"]` query on write-tool results. Keep greeting, suggested prompts (add agentic ones: "Add a new friend named …", "Update Asha's birthday to …"), scrapbook styling, streaming indicator.
- [ ] `bun run lint && bun run format` (per project convention).
- [ ] Commit: `feat(web): agentic chat UI with streaming + shared contracts`.

### Task 12: local verification → PR → merge

- [ ] `bun test` (root: shared + api unit + integration) and `bun run build` (web) — all green.
- [ ] `GEMINI_API_KEY=… OPENCODE_API_KEY=… ./nexia.sh ra`; manual API smoke via curl: signup (check log for verify URL since email disabled) → verify → login (cookies) → create profile → list/get/update/delete → worker logs show embedding upsert → chat: ask question (RAG), then "add a friend named Test…" agent flow creates profile. Frontend at :3000 click-through.
- [ ] Push branch, `gh pr create` (full description), review CI if any, **merge to master** (user pre-authorized).

### Task 13: Railway cutover + Vercel + prod verification

- [ ] Locate OpenCode Go API key: check `~/.local/share/opencode/auth.json` / ask user if absent. **Blocker if unavailable.**
- [ ] Railway `backend` service: set root directory `/` + dockerfile `apps/api/Dockerfile` (railway MCP `update_service` / `connect_service_source`), keep existing `NEXIA_*` vars, add `NEXIA_AI_OPENCODE_API_KEY`, `NEXIA_AI_CHAT_MODEL=deepseek-v4-pro`; confirm `NEXIA_DB_RUN_MIGRATIONS` is true (baseline must run) — check current value first.
- [ ] Deploy from master; tail build+deploy logs; verify `/api/v1/healthz`, `/readyz` 200.
- [ ] Prod smoke (curl against api.nexia.hishaam.dev): login with a test account, list profiles (existing data intact!), create+delete a test profile, chat agent round-trip; check worker log lines; verify existing JWT cookie still valid if available.
- [ ] Vercel: switch project root directory `frontend` → `apps/web` (vercel CLI if authed, else dashboard instruction to user), redeploy, verify nexia.hishaam.dev.
- [ ] Rollback plan: Railway redeploy previous deployment (Go image digest still cached); DB untouched except `drizzle` schema bookkeeping.
- [ ] Report results with evidence (status codes, log excerpts).

---

## Self-review notes

- Spec coverage: every spec section maps to a task (layout→1, contracts→2, config→3, db/baseline→4, middleware→5, repos/email/queue→6, services→7, agent+streaming→8, routes/swagger/docker/bootstrap→9, tests→5/7/8/10, frontend→11, deploy→12/13). ✓
- Known risks called out inline: drizzle migration hash scheme (verify against installed source), AI SDK major version (verify via context7 first), bcrypt `$2a$` fixture (generate before deleting Go), Vercel root-dir change (may need dashboard).
- Type consistency: contract types come from `@nexia/shared` everywhere; repositories return contract shapes; services take/return them.
