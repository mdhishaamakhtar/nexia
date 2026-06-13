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
| Backend | Bun, Hono, Drizzle ORM, BullMQ |
| Database | PostgreSQL 17 + pgvector extension |
| Queue | Redis 7 + BullMQ |
| AI / Embeddings | Vercel AI SDK, Google Gemini (`gemini-embedding-001` for 3072-dim embeddings), OpenCode (chat model) |
| Email | Resend API |
| Container | Docker + Docker Compose |
| Monorepo | Bun workspaces |

---

## Repository Layout

```
nexia/
├── apps/
│   ├── api/                      # Bun + Hono backend service
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
│   │   │   ├── app.ts            # DI wiring factory
│   │   │   └── index.ts          # Entry point
│   │   ├── Dockerfile
│   │   ├── drizzle.config.ts
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
├── docker-compose.yml            # Full-stack local Docker environment
├── nexia.sh                      # Dev CLI helper (wraps docker compose)
└── package.json                  # Monorepo root (bun workspaces)
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
| `db` | `host`, `port`, `user`, `password`, `name`, `ssl_mode`, `run_migrations`, connection pool settings |
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
| PUT | `/profiles/:id` | Yes | Full-overwrite update |
| DELETE | `/profiles/:id` | Yes | Delete profile |

`GET /profiles` accepts query params: `page`, `limit`, `search` (name substring),
`relationship_type`.

### Testing

**Framework:** `bun:test` (built-in Bun test runner)

```bash
cd apps/api
bun test src              # Unit tests
```

```bash
bun test                  # All tests (from root)
```

Unit tests are **colocated** with the code they cover (e.g.,
`services/auth-service.test.ts` sits next to `services/auth-service.ts`).
No external test dependencies. Each test file defines its own fake/stub
classes that implement the service-package interfaces.

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

Always create new migrations via `bun run db:generate` from `apps/api/`.
Never edit existing migration files.

---

## Frontend Architecture

### Route Groups

The app is split into three route groups. Groups are organisational only — they
do **not** change URLs.

| Group | Layout | Purpose |
|---|---|---|
| `app/(marketing)/` | none (inherits root) | SSR landing page — Server Component, no auth |
| `app/(auth)/` | none (inherits root) | Login, signup, verify-email, forgot/reset password |
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
| `/login` | `app/(auth)/login/page.tsx` | No | Auth form (login + signup) |
| `/verify-email` | `app/(auth)/verify-email/page.tsx` | No | Post-signup info |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx` | No | Forgot password form |
| `/reset-password` | `app/(auth)/reset-password/page.tsx` | No | Reset password form |
| `/profiles` | `app/(dashboard)/profiles/page.tsx` | No | Profile list (scrapbook view) |
| `/profiles/new` | `app/(dashboard)/profiles/new/page.tsx` | No | Create profile form |
| `/profiles/[id]` | `app/(dashboard)/profiles/[id]/page.tsx` | No | Profile detail view |
| `/profiles/[id]/edit` | `app/(dashboard)/profiles/[id]/edit/page.tsx` | No | Edit profile form |
| `/chat` | `app/(dashboard)/chat/page.tsx` | No | AI chat interface |

### Component Hierarchy

```
components/
  ai-elements/  — AI chat components (conversation, message, prompt-input)
  atoms/        — Primitive UI: Button, Input, Chip
  molecules/    — Composed UI: Navbar, CardProfilePreview, ConfirmDialog, QuoteModal, SectionWrapper
  ui/           — shadcn/ui primitives (button, input-group, tooltip, etc.)

features/
  auth/api.ts         — Auth API calls
  chat/api.ts         — Chat API calls (DefaultChatTransport)
  chat/components/    — ChatHeader, ChatMessage, ChatEmptyState, ToolActivity
  chat/hooks/         — useNexiaChat (wraps useChat with cache invalidation)
  chat/lib/           — Tool metadata registry
  profiles/api.ts     — Profile CRUD API calls
  profiles/components — ProfileForm, FieldArrayInput, ProfileFormSection, ZodiacIcon

shared/
  api/client.ts       — ky instance (base URL + credentials + CSRF/401 hooks)
  types/              — TypeScript types: Profile, API response shapes
  providers/          — React Query QueryClientProvider wrapper
  ui/                 — Toast, AIIcons (NexiaIcon, StickerSparkle)
```

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

- Docker + Docker Compose
- Bun 1.x (package manager and runtime)
- A Google Gemini API key (optional; required for AI/chat features)

### Local Development (hybrid: infra in Docker, services native)

```bash
# Start only Postgres + Redis
docker compose up -d postgres redis
# OR
./nexia.sh infra

# Install dependencies
bun install

# Run backend (from apps/api/)
bun --filter api dev

# Run frontend (from apps/web/)
bun --filter web dev        # http://localhost:3000
```

### Full Docker Stack

```bash
GEMINI_API_KEY=your_key_here ./nexia.sh ra   # build + start everything
# Frontend accessible at http://localhost:3000
```

### Monorepo Commands

```bash
# From root
bun run typecheck          # Typecheck all packages
bun run lint               # ESLint all packages
bun run lint:fix           # ESLint fix
bun run format             # Prettier write
bun run format:check       # Prettier check
bun test                   # Run all tests

# Filter to specific packages
bun --filter api dev       # Run API dev server
bun --filter web dev       # Run web dev server
bun --filter api test      # Run API tests
bun --filter web build     # Build web for production
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
cd apps/api
bun test src               # Unit tests (colocated with code)
```

### Frontend Linting / Formatting

```bash
bun run lint               # ESLint + Prettier auto-fix
bun run format             # Prettier write
```

### Database Migrations

```bash
cd apps/api
bun run db:generate        # Generate new migration from schema changes
```

Migrations run automatically at server startup.

### Embedding Back-fill

If profiles exist without embeddings (e.g., after Redis was wiped or Gemini
was not configured at creation time), re-queue all profiles:

```bash
cd apps/api
bun run sync
```

---

## Key Conventions

### Backend (TypeScript / Bun + Hono)

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
5. **Migration discipline**: always generate migrations via `bun run db:generate`.
   Never edit existing migration files.
6. **Zodiac sign**: never set `zodiac_sign` directly on a Profile; it is always
   derived by `applyDerivedZodiac` in the service layer from `birthday`.
7. **Top songs limit**: max 3 is enforced in the service layer, not the DB or
   controller.
8. **Unit tests**: colocated with the code they cover (e.g.,
   `services/auth-service.test.ts`). Use the fake/stub pattern — no real DB or
   network in unit tests.
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
8. **Lint and format after every change**: run `bun run lint && bun run format`
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
