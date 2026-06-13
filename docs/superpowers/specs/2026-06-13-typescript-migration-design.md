# Nexia: Go → TypeScript Monorepo Migration + Agentic Chat — Design

**Date:** 2026-06-13
**Status:** Approved by user

## Goal

Replace the Go backend with a TypeScript backend (Bun + Hono + Drizzle) inside a
Bun-workspaces monorepo, share API contract types between backend and frontend,
upgrade the RAG chat into a streaming tool-using agent, and cut over the Railway
production deployment in place — with full test parity to the existing Go suites.

## Monorepo layout

```
nexia/
├── package.json              # workspaces: ["apps/*", "packages/*"]
├── tsconfig.base.json        # shared strict TS config (TS 5.9.x)
├── apps/
│   ├── api/                  # Bun + Hono backend (replaces backend/)
│   │   ├── src/
│   │   │   ├── index.ts      # bootstrap: config → db → migrate → worker → serve
│   │   │   ├── app.ts        # Hono app factory, constructor-style DI
│   │   │   ├── config/       # yaml (local/prod) + NEXIA_ env overrides, zod-validated
│   │   │   ├── controllers/  # thin route handlers
│   │   │   ├── services/     # business logic + sentinel errors
│   │   │   ├── repositories/ # DAO layer on Drizzle
│   │   │   ├── db/           # drizzle schema, client, migration runner + prod baseline
│   │   │   ├── middleware/   # auth (JWT), CSRF double-submit, rate limits, request logging
│   │   │   ├── queue/        # BullMQ producer + worker
│   │   │   ├── ai/           # embeddings (AI SDK google) + agent (AI SDK openai-compatible)
│   │   │   ├── email/        # Resend sender + HTML templates
│   │   │   └── scripts/sync.ts  # embedding back-fill (replaces cmd/sync)
│   │   ├── drizzle/          # generated SQL migrations
│   │   ├── config/{local,prod}.yaml
│   │   ├── tests/integration/  # testcontainers (pgvector PG + Redis)
│   │   └── Dockerfile
│   └── web/                  # frontend/ moved here, wired to shared contracts
└── packages/
    └── shared/               # @nexia/shared — zod schemas + types for API contracts
```

## Stack mapping (flow preserved 1:1)

| Go | TypeScript |
|---|---|
| Gin + middleware | Hono: CORS, JWT auth (header or `nexia_token` cookie), CSRF double-submit (`nexia_csrf` cookie + `X-CSRF-Token`, cookie-auth only), per-IP token-bucket rate limits (auth + chat families, 429 `RATE_LIMITED`) |
| GORM | Drizzle ORM, `postgres-js` driver, pgvector `vector(3072)` column |
| golang-migrate | drizzle-kit migrations. Startup baseline: if the prod schema already exists (golang-migrate `schema_migrations` at version 5), mark the initial Drizzle migration applied without executing it |
| Asynq `task:embedding`/`task:deletion` | BullMQ queue + in-process worker; same semantics: profile-not-found skips retry; delete enqueues vector cleanup after DB delete |
| bcrypt | `Bun.password` bcrypt — verifies existing `$2a$` hashes |
| golang-jwt HS256 | `jose` HS256, identical claims (`user_id`, `iat`, `exp`); same secret and cookie names → existing sessions survive cutover |
| Viper config | yaml + `NEXIA_*` env overrides (same names) → Railway env vars unchanged |
| zap | pino structured JSON logging with request context |
| swag Swagger | OpenAPI generated from shared zod schemas; Swagger UI at `/api/v1/swagger` |
| Gemini chat | Agent on OpenCode Go `deepseek-v4-pro` (configurable `NEXIA_AI_CHAT_MODEL`) via Vercel AI SDK `@ai-sdk/openai-compatible`, base URL `https://opencode.ai/zen/go/v1` |
| Gemini embeddings (`google.golang.org/genai`) | Vercel AI SDK `embed()` with `@ai-sdk/google` `gemini-embedding-001`, 3072 dims (Gemini API key) |

AI degradation rules (unchanged in spirit): missing OpenCode Go key → `/chat`
returns 503 `AI_UNAVAILABLE`. Missing Gemini key or Redis URL → embedding
pipeline disabled, CRUD still works; agent's `ragSearch` tool reports
unavailability while text-search tools keep working.

## API surface (unchanged paths and envelope)

All under `/api/v1`: healthz, readyz, auth (signup, login, verify-email, me,
logout, forgot-password, reset-password), chat, profiles CRUD + list
(`page`/`limit`/`search`/`relationship_type`), swagger. Error envelope stays
`{ "error": { "code", "message" } }`; success returns data directly. Sentinel
error → HTTP mapping identical (401/400/404/409/503/500, plus 429 from rate
limiting and 403 CSRF codes).

## Nexia Intel agent

`POST /api/v1/chat` (auth + CSRF + chat rate limit) accepts `{ messages }`
(AI SDK UI messages, client holds history — stateless server) and streams an
AI SDK UI-message SSE response. Tools, all hard-scoped to the authenticated
user, implemented on top of the same services as REST:

- `ragSearch(query, limit≤10)` — embed via Gemini → pgvector cosine top-N
- `searchProfiles(search?, relationshipType?, page?, limit?)` — text search
- `getProfile(id)`, `listProfiles(page, limit)`
- `createProfile(payload)` / `updateProfile(id, payload)` — shared zod schema
  validated; ProfileService rules apply (top songs ≤ 3, derived zodiac,
  embedding re-queue)

System prompt: Nexia Intel persona (markdown, witty, concise) + agent rules:
gather required fields (`full_name`, `relationship_type`), ask clarifying
questions, summarize and get user confirmation in conversation before calling
any write tool. Step loop capped at ~10 steps.

## Frontend changes (apps/web)

- Chat page rebuilt on `@ai-sdk/react` `useChat` with a fetch transport that
  sends credentials + `X-CSRF-Token`; streaming markdown rendering; tool
  activity chips ("Searching profiles…", "✓ Created Asha" with link); profiles
  query invalidation when the agent writes. Existing scrapbook design tokens.
- Local API types in `src/shared/types` replaced by `@nexia/shared` imports.
- Same TS version across workspace; lint/format clean.

## Tests (parity with Go suites)

- Unit: colocated `*.test.ts` using `bun:test` with local fakes (repos, queue,
  email, AI clients) — same cases as Go: auth service (signup/login/verify/
  forgot/reset, enumeration silence), profile service (top-songs limit, zodiac
  derivation table, clamping, queue enqueue/no-queue), embedding service, chat
  agent guards, config loader, middleware (auth, CSRF, both rate limiters),
  utils (JWT round-trip), queue handlers (skip-retry on missing profile).
- Integration: `tests/integration` with testcontainers — pgvector Postgres +
  Redis; real HTTP against the Hono app: health, auth flows, authorization
  (cross-user 404s), profiles CRUD + list filters/pagination, async worker
  (fake embedder), chat (fake model), migrations (fresh apply + baseline path).

## Deployment

- Docker: `oven/bun` multi-stage images for api and web; build context = repo
  root (workspace deps); docker-compose.yml and nexia.sh updated.
- Railway (in-place cutover): same `backend` service; update root directory /
  Dockerfile path config; keep all `NEXIA_*` vars; add
  `NEXIA_AI_OPENCODE_API_KEY` and `NEXIA_AI_CHAT_MODEL=deepseek-v4-pro`.
  Deploy from master after PR merge; verify healthz/readyz, smoke-test auth +
  profiles + chat against prod; watch worker logs. Rollback = redeploy previous
  commit (schema untouched apart from Drizzle bookkeeping table).
- Vercel web: root directory moves `frontend` → `apps/web`, workspace-aware
  install/build from repo lockfile.

## Out of scope

- No conversation persistence (client-held history).
- No new product features beyond the agent; profile REST behavior unchanged.
- Embedding provider stays Gemini (OpenCode Go offers no embedding models).
