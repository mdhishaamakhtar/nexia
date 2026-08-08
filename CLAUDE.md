# CLAUDE.md — Nexia Codebase Guide

This file provides AI assistants (Claude Code and similar tools) with a
structured overview of the Nexia repository: its architecture, conventions,
development workflows, and key decisions to follow when making changes.

---

## Project Overview

**Nexia** is a digital slambook / friend-profile scrapbook application. Users
create rich profiles for their contacts (friends, family, colleagues, etc.) and
query them via an AI chat assistant ("Nexia Intel") that uses RAG (Retrieval-
Augmented Generation) over the stored profiles.

**Tech stack at a glance**

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, TanStack Query v5, React Hook Form + Zod, Framer Motion |
| Backend | Node 24, Hono, Drizzle ORM, BullMQ |
| Database | PostgreSQL 17 + pgvector extension |
| Queue | Redis 7 + BullMQ |
| AI / Embeddings | Vercel AI SDK, Google Gemini (`gemini-embedding-001` for 3072-dim embeddings), OpenCode (chat model) |
| Email | Resend API |
| Testing | Vitest, Testcontainers (Postgres + Redis), MSW, `ai/test` mock models |
| Container | Docker + Docker Compose |
| Monorepo | npm workspaces |

**Runtime note.** The backend runs on Node 24, not Bun. Bun's test runner emits
no branch-coverage data at all, which made a branch-coverage gate unmeasurable;
the Bun coupling was eight call sites, so the runtime moved instead of the goal.
Dev runs on `tsx`, production on a `tsup` bundle (`node dist/index.js`).

---

## Repository Layout

```
nexia/
├── apps/
│   ├── api/                      # Node + Hono backend service
│   │   ├── config/
│   │   │   ├── local.yaml        # Local dev config
│   │   │   └── prod.yaml         # Production config
│   │   ├── drizzle/              # SQL migration files (drizzle-kit)
│   │   ├── src/
│   │   │   ├── ai/               # Chat agent, embeddings, tools, system prompt
│   │   │   ├── config/           # Config struct + Zod loader
│   │   │   ├── controllers/      # Hono HTTP handlers
│   │   │   ├── db/               # Drizzle client, schema, migration runner
│   │   │   ├── email/            # Resend email service + templates
│   │   │   ├── logging/          # Pino structured logger
│   │   │   ├── middleware/       # Auth, CSRF, rate limiting, request context
│   │   │   ├── queue/            # BullMQ producer + worker
│   │   │   ├── repositories/     # Drizzle data access layer
│   │   │   ├── routes/           # Router setup (buildApp)
│   │   │   ├── scripts/          # Embedding back-fill utility
│   │   │   ├── services/         # Business logic (auth, profiles, embedding)
│   │   │   ├── utils/            # JWT, CSRF, validation helpers
│   │   │   ├── app.ts            # wireApp (pure graph) + createApp (bootstrap)
│   │   │   └── index.ts          # Entry point
│   │   ├── tests/
│   │   │   ├── helpers/          # harness, factories, mock model, MSW, waits
│   │   │   ├── integration/      # one file per surface
│   │   │   └── setup/            # containers (global) + truncation (per test)
│   │   ├── Dockerfile
│   │   ├── drizzle.config.ts
│   │   ├── tsup.config.ts
│   │   └── package.json
│   └── web/                      # Next.js frontend application
│       └── src/
│           ├── app/              # Next.js App Router pages
│           ├── components/       # Atomic UI + ai-elements components
│           ├── context/          # React context (AuthContext)
│           ├── features/         # Feature-sliced modules (auth, chat, profiles)
│           └── shared/           # Shared API client, types, providers, UI
├── packages/
│   └── shared/                   # @nexia/shared — Zod schemas, types, enums
│       └── src/
├── docs/
│   └── superpowers/              # Migration plan docs (reference only)
├── .github/workflows/ci.yml      # typecheck, lint, format, tests + coverage gate
├── docker-compose.yml            # Full-stack local Docker environment
├── nexia.sh                      # Dev CLI helper (wraps docker compose)
├── vitest.config.ts              # Three projects + istanbul coverage thresholds
└── package.json                  # Monorepo root (npm workspaces)
```

---

## Backend Architecture

### Dependency Injection Pattern

The backend uses **explicit constructor-based DI** wired in a single
`createApp()` factory (`app.ts`). There are no DI frameworks or decorators.

```
loadConfig() → createLogger() → createDb() → runMigrations()
  → Repositories  (concrete classes, take DB handle)
  → Services      (take repository interfaces + config + logger)
  → ChatAgent     (takes model + services + embedding infra)
  → buildApp()    (Hono router, takes services + config)
```

**Consumer-defined interfaces:** Each service file declares the interfaces its
dependencies must satisfy (e.g., `UserRepo`, `ProfileRepo`, `EmbeddingQueue`,
`EmbeddingGenerator`, `EmailSender`). Repositories satisfy them implicitly via
TypeScript structural typing.

### Request Flow

```
HTTP Request
  → CORS middleware (hono/cors)
  → requestContext middleware (request ID, structured logging, duration)
  → [Public routes] auth rate limiter → auth controller
  → [Protected routes] authMiddleware (JWT from Bearer header or nexia_token cookie)
     → csrfMiddleware (double-submit cookie for cookie-auth only)
     → [Chat] chat rate limiter → chat controller → ChatAgent
     → [Profiles] profile controller → ProfileService
  → JSON response
```

### Authentication

- **Separate endpoints**: `POST /api/v1/auth/signup` (create account) and
  `POST /api/v1/auth/login` (authenticate). Email verification is required
  before login succeeds.
- JWT tokens are HS256-signed (via `jose`), configurable expiry (default 1440 min = 24 h).
- Tokens are accepted via `Authorization: Bearer <token>` header **or** the
  `nexia_token` httpOnly cookie (the frontend uses the cookie path).
- CSRF protection (double-submit cookie pattern) only applies to
  cookie-authenticated requests. Bearer-authenticated requests bypass CSRF.

### Configuration

Config is loaded via YAML + Zod validation from `config/local.yaml` or
`config/prod.yaml` (controlled by the `APP_ENV` env var). All fields can be
overridden with env vars prefixed `NEXIA_` where dots become underscores:

```
NEXIA_DB_PASSWORD  →  db.password
NEXIA_AI_REDIS_URL →  ai.redis_url
```

Key config sections:

| Section | Fields |
|---|---|
| `server` | `port`, `mode`, `jwt_secret`, `jwt_expiry_minutes`, `cors_origins`, `cookie_domain`, auth/chat rate limit fields |
| `db` | `host`, `port`, `user`, `password`, `name`, `ssl_mode`, `run_migrations`, `max_open_conns`, `conn_max_lifetime_minutes`, `idle_timeout_seconds` |
| `ai` | `gemini_api_key`, `redis_url`, `opencode_api_key`, `opencode_base_url`, `chat_model` |
| `email` | `resend_api_key`, `from_address`, `app_base_url` |

### Rate Limiting

Auth and chat routes use in-memory per-IP token buckets.

Auth route family:

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

Chat route family:

- `POST /api/v1/chat`

Requests beyond the burst are rejected with HTTP 429 and `RATE_LIMITED`.
This is in-memory only, so limits are per process, not global across replicas.

### API Endpoints

All routes are under `/api/v1`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/healthz` | No | Liveness probe |
| GET | `/readyz` | No | Readiness probe (checks DB) |
| POST | `/auth/signup` | No | Create account, sends verification email |
| POST | `/auth/login` | No | Authenticate, returns JWT + sets cookies |
| GET | `/auth/verify-email` | No | Verify email address |
| POST | `/auth/forgot-password` | No | Send password reset email |
| POST | `/auth/reset-password` | No | Reset password with token |
| GET | `/auth/me` | Yes | Returns current user info |
| POST | `/auth/logout` | Yes | Clears auth + CSRF cookies |
| POST | `/chat` | Yes | AI chat with tool-calling agent (streaming) |
| POST | `/profiles` | Yes | Create profile |
| GET | `/profiles` | Yes | List profiles (paginated, filterable) |
| GET | `/profiles/:id` | Yes | Get single profile |
| PUT | `/profiles/:id` | Yes | Full replacement — omitted optional fields are cleared |
| DELETE | `/profiles/:id` | Yes | Delete profile; 404 if missing or not yours |

`GET /profiles` accepts query params: `page`, `limit`, `search` (name substring),
`relationship_type`.

### Testing

**Framework:** Vitest, configured as three projects in the root
`vitest.config.ts`.

| Project | Location | Needs Docker? |
|---|---|---|
| `shared` | `packages/shared/src/**/*.test.ts` | No |
| `api-unit` | `apps/api/src/**/*.test.ts` (colocated) | No |
| `api-integration` | `apps/api/tests/integration/**` | Yes |

```bash
npm test                   # everything
npm run test:unit          # fast, no containers
npm run test:integration    # containers only
npm run test:coverage      # enforces the coverage gate
npm run test:watch
```

**Integration-first.** Anything that crosses a boundary is tested against real
infrastructure: Testcontainers starts one Postgres (`pgvector/pgvector:pg17`,
the same image as docker-compose) and one Redis for the whole run, migrations
are applied once, and tests are isolated by truncating every public table
between cases. Integration files run sequentially, since they share those
containers.

`tests/helpers/harness.ts` assembles the **real** application graph via
`wireApp` — real repositories, real services, the real Hono router — and
requests go through `app.request()`, so real JWTs, cookies, CSRF and rate
limiting are all exercised. Only the outbound network edges are substituted:

- **Language model** → `MockLanguageModelV4` from `ai/test`, scripted turn by
  turn, so agent tools run for real against the database.
- **Embeddings** → a deterministic bag-of-words embedder, so cosine ranking is
  assertable and repeatable.
- **Resend** → MSW, so the real `EmailService` code path runs. Any unstubbed
  outbound request fails the test rather than escaping to the network.

**Unit tests are for logic that earns them** — pure, branch-dense code such as
`profile-mapper` null-collapsing, zodiac boundaries, config coercion and the
rate-limit bucket maths. They are colocated with their subject. Do not write a
unit test with hand-rolled repository fakes for something an integration test
already proves; that pattern is what let a batch of real defects through.

**Coverage gate:** 90% branches / functions / lines / statements, enforced by
`@vitest/coverage-istanbul` over `apps/api/src` and `packages/shared/src`. Only
genuinely untestable bootstrap is excluded (`index.ts`, `scripts/`,
`db/schema.ts`). Do not hit the number by widening the exclude list.

### Error Handling Convention

Controllers use `respondWithServiceError(c, err)` which maps `ServiceError.kind`
to HTTP status codes:

| ErrorKind | HTTP | Error Code |
|---|---|---|
| `account_not_found` | 401 | `ACCOUNT_NOT_FOUND` |
| `unauthorized` | 401 | `UNAUTHORIZED` |
| `validation` | 400 | `VALIDATION_ERROR` |
| `not_found` | 404 | `NOT_FOUND` |
| `ai_unavailable` | 503 | `AI_UNAVAILABLE` |
| `email_not_verified` | 403 | `EMAIL_NOT_VERIFIED` |
| `email_conflict` | 409 | `EMAIL_CONFLICT` |
| (anything else) | 500 | `SERVER_ERROR` |

Error responses always have the shape:
```json
{ "error": { "code": "NOT_FOUND", "message": "Resource not found" } }
```

Anything that escapes a controller is caught by `errorHandler` in
`middleware/request-context.ts`, registered with **`app.onError`** — not as
middleware. Hono's dispatcher catches a throwing handler itself and routes it
straight to the error handler, so a middleware wrapping `await next()` in
try/catch never sees it. Keep it on `onError`, or unhandled failures silently
revert to Hono's plain-text default and break the envelope above.

### Data Models

**User**: `id`, `email` (unique), `password` (bcrypt hashed), `email_verified`, timestamps.

**Profile**: Rich contact card for a person in the user's network. Belongs to a
`User`. Has many child associations (all ON DELETE CASCADE):

| Association | Max | Notes |
|---|---|---|
| `Tags` | unlimited | Personality/interest tags |
| `PoliticalViews` | unlimited | |
| `FoodRestrictions` | unlimited | |
| `MovieGenres` | unlimited | |
| `BookGenres` | unlimited | |
| `HangoutPlaces` | unlimited | |
| `Quotes` | unlimited | |
| `TopSongs` | **3** | Enforced in service layer |
| `AssociatedSong` | 1 | Has-one, not has-many |

`RelationshipType` is an enum: `Friend`, `Family`, `Colleague`, `Classmate`,
`Crush`, `Ex`, `Mentor`, `Other`.

`ZodiacSign` is **derived automatically** from `Birthday` — never set it
manually. `applyDerivedZodiac` in `services/zodiac.ts` handles this on every
create/update.

**profile_embeddings**: pgvector table storing a 3072-dim embedding and a
full JSONB snapshot of the profile. Managed exclusively by the async queue
worker, never by the profile repository.

### Asynchronous Embedding Pipeline

When a profile is created or updated, the service enqueues a `task:embedding`
BullMQ task. The worker picks it up, flattens the full profile (with all
preloaded associations) into text, calls `gemini-embedding-001`, then upserts
the result into `profile_embeddings`.

On profile delete, a `task:deletion` task removes the vector row asynchronously.

If `ai.redis_url` or `ai.gemini_api_key` is absent, the queue and Gemini
client are null. The service layer skips embedding gracefully — all CRUD still
works, but `/chat` returns 503.

### RAG Chat Flow

`POST /chat` → `ChatAgent`:
1. The AI SDK's `streamText` with tool-calling is used.
2. The agent has 6 tools: `ragSearch`, `searchProfiles`, `getProfile`,
   `listProfiles`, `createProfile`, `updateProfile`.
3. `ragSearch` generates a query embedding via `gemini-embedding-001`, searches
   `profile_embeddings` with cosine similarity, filtered by `user_id`, returning
   top-5 results with their JSONB payload.
4. The system prompt instructs the agent to prefer RAG for fuzzy queries,
   require user confirmation before writes, and never fabricate data.

### Database Migrations

Migrations live in `apps/api/drizzle/` using drizzle-kit naming. They run
automatically at server startup. The migration runner detects if the database
was previously managed by golang-migrate and baselines accordingly.

Always create new migrations via `npm run db:generate -w api` from `apps/api/`.
Never edit existing migration files.

---

## Frontend Architecture

### Route Groups

Only the authenticated area uses a route group. Groups are organisational only —
they do **not** change URLs.

| Path | Layout | Purpose |
|---|---|---|
| `app/page.tsx` | none (inherits root) | SSR landing page — Server Component, no auth |
| `app/login/`, `app/verify-email/`, `app/forgot-password/`, `app/reset-password/` | none (inherits root) | Unauthenticated pages, all built on `AuthCard` |
| `app/(dashboard)/` | `layout.tsx` (client) | All authenticated pages — auth guard + Navbar live here |

The `(dashboard)/layout.tsx` is a `"use client"` component that:
1. Reads `useAuth()` and redirects to `/login` if unauthenticated.
2. Renders `<Navbar />` once, persistently, for every dashboard page.
3. Renders `{children}` — individual pages contain **no** Navbar or auth guard.

This means navigating within the dashboard never remounts the layout — no
redundant auth checks, no Navbar flicker.

### Pages (App Router)

| Route | File | SSR? | Purpose |
|---|---|---|---|
| `/` | `app/page.tsx` | Yes | Static landing page (Server Component) |
| `/login` | `app/login/page.tsx` | No | Auth form (login + signup) |
| `/verify-email` | `app/verify-email/page.tsx` | Yes | Post-signup info (Server Component) |
| `/verify-email/confirm` | `app/verify-email/confirm/page.tsx` | No | Token verification result |
| `/forgot-password` | `app/forgot-password/page.tsx` | No | Forgot password form |
| `/reset-password` | `app/reset-password/page.tsx` | No | Reset password form |
| `/profiles` | `app/(dashboard)/profiles/page.tsx` | No | Profile list (scrapbook view) |
| `/profiles/new` | `app/(dashboard)/profiles/new/page.tsx` | No | Create profile form |
| `/profiles/[id]` | `app/(dashboard)/profiles/[id]/page.tsx` | No | Profile detail view |
| `/profiles/[id]/edit` | `app/(dashboard)/profiles/[id]/edit/page.tsx` | No | Edit profile form |
| `/chat` | `app/(dashboard)/chat/page.tsx` | No | AI chat interface |

### Layout & Design System

Read **`DESIGN.md`** at the repo root before changing any UI. The short version:

- **`PageShell`** (`components/layout/PageShell.tsx`) is the only container.
  Two widths — `wide` (72rem) for browse grids, the landing page, and the navbar;
  `reading` (48rem) for detail, forms, and chat. Never set `max-width` or
  horizontal padding on a page directly.
- **Material is flat opaque paper.** `.paper` / `.paper-sunk` plus a warm
  hairline. There is **no `backdrop-filter` and no `box-shadow` anywhere** —
  neither should be added. Form fields are white, not tinted.
- **Type comes from five classes** in `globals.css`: `.t-display`,
  `.t-page-title`, `.t-section-title`, `.t-body`, `.t-label`.
- **Soft accents are surface tints, never foregrounds.** Text and icons use the
  `-ink` variants (`peach-ink`, `blue-ink`, `red-ink`, …), which clear WCAG AA.
- Dashboard pages use `.page-body`, not `min-h-screen` (which overshoots by the
  navbar height and forces a scrollbar).

### Component Hierarchy

```
components/
  ai-elements/  — Vendored chat pieces, trimmed to what Nexia uses:
                  conversation.tsx, message.tsx (MessageResponse only)
  atoms/        — Button, Field, Input, Textarea, Select, BackButton, AuthRedirect
  layout/       — PageShell (container), AuthCard (unauthenticated page shell)
  molecules/    — Navbar, CardProfilePreview, ConfirmDialog, QuoteModal

features/
  auth/api.ts         — Auth API calls
  chat/api.ts         — Chat API calls (DefaultChatTransport)
  chat/components/    — ChatHeader, ChatMessage, ChatEmptyState, ChatComposer,
                        ToolActivity, ChatProfileCard
  chat/hooks/         — useNexiaChat (wraps useChat with cache invalidation)
  chat/lib/           — Tool metadata registry, markdown component overrides
  profiles/api.ts     — Profile CRUD calls + form-value mapping
  profiles/components — ProfileForm, FormActionBar, FieldArrayInput,
                        ProfileFormSection, ZodiacIcon

shared/
  api/client.ts       — ky instance (base URL + credentials + CSRF/401 hooks)
  types/              — TypeScript types: Profile, API response shapes
  providers/          — React Query + MotionConfig wrapper
  ui/                 — Toast, AIIcons (NexiaIcon, NexiaAvatar)
```

There is no `components/ui/` directory. The shadcn primitives were removed along
with the vendored `ai-elements/prompt-input.tsx` that was their only consumer;
the chat composer is now `features/chat/components/chat-composer.tsx`.

### Data Fetching

All server state uses **TanStack Query** (`@tanstack/react-query`). Mutations
invalidate relevant query keys on success. Do not use raw `useState` + `useEffect`
for server data — use `useQuery` / `useMutation`.

### Forms

Forms use **React Hook Form** + **Zod** via `@hookform/resolvers/zod`. Field
arrays (tags, songs, genres, etc.) use `useFieldArray`.

### API Client

`src/shared/api/client.ts` exports a pre-configured `ky` instance:
- Base URL from `NEXT_PUBLIC_BACKEND_URL` env var — browser calls the backend
  **directly** (no Vercel proxy). Falls back to `http://localhost:8080`.
- `credentials: "include"` so the `nexia_token` cookie is sent on every request.

### Chat

The chat UI uses the Vercel AI SDK's `useChat` hook with a `DefaultChatTransport`
that streams to the backend. Components from `ai-elements` (conversation, message,
prompt-input) provide the chat interface. Tool calls from the AI agent are
rendered as activity chips via `ToolActivity`.

### Auth

`AuthContext` (root layout) manages `isAuthenticated`, `login`, and `logout`.
The `(dashboard)/layout.tsx` enforces auth for all dashboard routes — there is
no separate `ProtectedRoute` component.

---

## Development Workflows

### Prerequisites

- Docker + Docker Compose (also required for the integration tests)
- Node 24 (see `.nvmrc`) and npm
- A Google Gemini API key (optional; required for AI/chat features)

### Local Development (hybrid: infra in Docker, services native)

```bash
# Start only Postgres + Redis
docker compose up -d postgres redis
# OR
./nexia.sh infra

# Install dependencies
npm install

# Run backend
npm run dev:api

# Run frontend
npm run dev:web            # http://localhost:3000
```

### Full Docker Stack

```bash
GEMINI_API_KEY=your_key_here ./nexia.sh ra   # build + start everything
# Frontend accessible at http://localhost:3000
```

### Monorepo Commands

```bash
# From root
npm run typecheck          # Typecheck all workspaces
npm run lint               # ESLint all packages
npm run lint:fix           # ESLint fix
npm run format             # Prettier write
npm run format:check       # Prettier check
npm test                   # Run all tests
npm run test:coverage      # Run tests with the 90% gate enforced

# Per workspace
npm run dev:api            # API dev server (tsx watch)
npm run dev:web            # Web dev server
npm run build:api          # Bundle the API to apps/api/dist
npm run build              # Build web for production
```

### nexia.sh Reference

| Command | Action |
|---|---|
| `./nexia.sh rb` | Rebuild + restart backend container |
| `./nexia.sh rf` | Rebuild + restart frontend container |
| `./nexia.sh ra` | Rebuild + restart all services |
| `./nexia.sh infra` | Restart Postgres + Redis (data preserved) |
| `./nexia.sh wipe` | Destroy + recreate Postgres + Redis volumes (data lost) |
| `./nexia.sh stop` | Stop all services |
| `./nexia.sh start [-b]` | Start all services detached (optional rebuild) |

### Running Backend Tests

```bash
npm run test:unit          # colocated unit tests, no Docker needed
```

```bash
npm run test:integration   # testcontainers; requires a running Docker daemon
```

### Frontend Linting / Formatting

```bash
npm run lint               # ESLint
npm run format             # Prettier write
```

### Database Migrations

```bash
npm run db:generate -w api    # Generate new migration from schema changes
```

Migrations run automatically at server startup.

### Embedding Back-fill

If profiles exist without embeddings (e.g., after Redis was wiped or Gemini
was not configured at creation time), re-queue all profiles:

```bash
cd apps/api
npm run sync -w api
```

---

## Key Conventions

### Backend (TypeScript / Node + Hono)

1. **Thin controllers**: controllers only parse input (via `parseJsonBody` with
   Zod schemas from `@nexia/shared`), call the service, and write the response.
   Business logic belongs in the service layer.
2. **Consumer-defined interfaces**: interfaces are declared in the service file
   (the consuming module), not in the repository package. Repositories satisfy
   them implicitly via TypeScript structural typing.
3. **Sentinel errors**: use the factory functions in `services/errors.ts`
   (`errValidation()`, `errNotFound()`, etc.). Never throw raw `Error` for
   errors that cross a layer boundary.
4. **No hard-coded secrets**: use env vars with the `NEXIA_` prefix.
5. **Migration discipline**: always generate migrations via `npm run db:generate -w api`.
   Never edit existing migration files.
6. **Zodiac sign**: never set `zodiac_sign` directly on a Profile; it is always
   derived by `applyDerivedZodiac` in the service layer from `birthday`.
7. **Top songs limit**: max 3 is enforced in the service layer, not the DB or
   controller.
8. **Tests**: integration-first against real Postgres/Redis via testcontainers;
   colocated unit tests only for pure, branch-dense logic. See the Testing
   section above. Reach for an integration test before a fake.
9. **Password hashing goes through the `PasswordHasher` port** injected into
   `AuthService`, never a global. Production wires `createBcryptHasher()`
   (bcrypt cost 10); tests inject cost 4 so the suite is not dominated by KDF
   time.
10. **`replaceProfile` vs `updateProfile`**: the REST `PUT` replaces (omitted
    fields are cleared) and the chat agent's `updateProfile` tool merges. They
    are separate service methods on purpose — collapsing them back into one is
    what previously made `PUT` silently ignore omitted fields.
9. **Structured logging**: all logging goes through pino. Use child loggers for
   components. Never use `console.log` in production code.
10. **Graceful degradation**: the embedding pipeline is entirely optional.
    Queue enqueue failures are logged but never propagate to the caller.

### Frontend (TypeScript / Next.js)

1. **App Router only**: all pages go in `src/app/`. No Pages Router patterns.
2. **Server state via React Query**: avoid `useState`+`useEffect` for API data.
3. **Form validation**: React Hook Form + Zod schema. No ad-hoc validation.
4. **Atomic component structure**: atoms → molecules → features → pages.
5. **Single ky instance**: always use `src/shared/api/client.ts`. Don't
   create additional ky/fetch instances.
6. **Cookie auth**: the frontend relies on `withCredentials: true`. Don't
   switch to localStorage tokens without a coordinated backend change.
7. **TypeScript strict**: don't use `any`. Define types in `src/shared/types/`
   or `packages/shared/`.
8. **Lint and format after every change**: run `npm run lint && npm run format`
   from the root after any frontend file is modified. Do this before marking a
   task complete or committing.

### Shared Package (`@nexia/shared`)

1. **Single source of truth**: all Zod schemas for request/response validation
   live here. Both `apps/api` and `apps/web` consume the same types.
2. **No runtime dependencies**: this package exports only types, schemas, and
   constants. No database, no HTTP, no framework code.

### Git

- Feature branches follow the pattern `claude/<description>-<id>`.
- Commit messages use conventional prefixes: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Open PRs against `master`.

---

## Environment Variables Reference

### Backend

| Variable | Config key | Default (local.yaml) | Required |
|---|---|---|---|
| `APP_ENV` | — | `local` | No |
| `CONFIG_DIR` | — | `config` | No |
| `LOG_LEVEL` | — | `info` | No |
| `NEXIA_SERVER_PORT` | `server.port` | `8080` | No |
| `NEXIA_SERVER_JWT_SECRET` | `server.jwt_secret` | `super-secret-key-for-dev` | **Yes (prod)** |
| `NEXIA_SERVER_JWT_EXPIRY_MINUTES` | `server.jwt_expiry_minutes` | `1440` | No |
| `NEXIA_SERVER_CORS_ORIGINS` | `server.cors_origins` | `http://localhost:3000` | No |
| `NEXIA_SERVER_COOKIE_DOMAIN` | `server.cookie_domain` | _(empty)_ | No |
| `NEXIA_DB_HOST` | `db.host` | `localhost` | Yes |
| `NEXIA_DB_PORT` | `db.port` | `5432` | No |
| `NEXIA_DB_USER` | `db.user` | `postgres` | Yes |
| `NEXIA_DB_PASSWORD` | `db.password` | `password` | **Yes (prod)** |
| `NEXIA_DB_NAME` | `db.name` | `nexia_db` | Yes |
| `NEXIA_DB_SSL_MODE` | `db.ssl_mode` | `disable` | No |
| `NEXIA_AI_GEMINI_API_KEY` | `ai.gemini_api_key` | _(empty)_ | For AI/chat |
| `NEXIA_AI_REDIS_URL` | `ai.redis_url` | `127.0.0.1:6379` | For AI/chat |
| `NEXIA_AI_OPENCODE_API_KEY` | `ai.opencode_api_key` | _(empty)_ | For AI/chat |
| `NEXIA_EMAIL_RESEND_API_KEY` | `email.resend_api_key` | _(empty)_ | For email |
| `NEXIA_EMAIL_APP_BASE_URL` | `email.app_base_url` | `http://localhost:3000` | No |

### Frontend

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Backend base URL (e.g., `http://localhost:8080` locally, `http://backend:8080` in Docker) |
