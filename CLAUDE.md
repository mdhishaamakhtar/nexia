# CLAUDE.md — Nexia Codebase Guide

This file provides AI assistants (Claude Code and similar tools) with a
structured overview of the Nexia repository: its architecture, conventions,
development workflows, and key decisions to follow when making changes.

---

## Project Overview

**Nexia** is a digital slambook / friend-profile scrapbook application. Users
create rich profiles for their contacts (friends, family, colleagues, etc.) and
query them via an AI chat assistant ("Ask Nexia") that uses RAG (Retrieval-
Augmented Generation) over the stored profiles, and can add or update profiles
once the user approves each change.

**Tech stack at a glance**

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, TanStack Query v5, React Hook Form + Zod, Framer Motion |
| Backend | Node 24, Hono, Drizzle ORM (postgres.js) |
| Database | PostgreSQL 17 + pgvector extension |
| AI / Embeddings | Vercel AI SDK v7, Google Gemini (`gemini-embedding-001` for 3072-dim embeddings), OpenCode Zen (chat model, `space-bunny-free` by default) |
| Email | Resend API |
| Testing | Vitest (API, shared, web in jsdom with Testing Library), Testcontainers (Postgres), MSW, `ai/test` mock models, Playwright (browser journeys) |
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
│   │   │   ├── repositories/     # Drizzle data access layer
│   │   │   ├── routes/           # Router setup (buildApp)
│   │   │   ├── services/         # Business logic (auth, profiles, embedding worker)
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
│       ├── scripts/              # brand-assets.ts (renders icons from the mark)
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
│   └── brand/                    # Logo mark, wordmark, social preview (rendered)
├── .github/workflows/ci.yml      # typecheck, lint, format, tests + coverage gate, builds, e2e
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
dependencies must satisfy (e.g., `UserRepo`, `ProfileRepo`,
`EmbeddingScheduler`, `EmbeddingGenerator`, `EmailSender`). Repositories satisfy them implicitly via
TypeScript structural typing.

### Request Flow

```
HTTP Request
  → CORS middleware (hono/cors)
  → requestContext middleware (request ID, structured logging, duration)
  → [Public auth routes] 16 KB body limit → auth rate limiter (per client address) → auth controller
  → [Protected routes] authMiddleware (JWT from Bearer header or nexia_token cookie;
     rejects tokens issued before the last password change; renews a cookie session
     past half its life)
     → csrfMiddleware (double-submit cookie for cookie-auth only)
     → [Chat] 1 MB body limit → chat rate limiter (per user) → chat controller → ChatAgent
     → [Profiles] 256 KB body limit → profile controller → ProfileService
  → JSON response; anything thrown is answered by errorHandler (app.onError)
```

### Authentication

- **Separate endpoints**: `POST /api/v1/auth/signup` (create account) and
  `POST /api/v1/auth/login` (authenticate). Email verification is required
  before login succeeds.
- JWT tokens are HS256-signed (via `jose`, and verification is pinned to HS256),
  configurable expiry (default 1440 min = 24 h). Cookie sessions slide: past half
  their life, the next request re-issues them.
- Tokens are accepted via `Authorization: Bearer <token>` header **or** the
  `nexia_token` httpOnly cookie (the frontend uses the cookie path). Cookies are
  `SameSite=Lax`, and `Secure` in release mode.
- Changing or resetting a password sets `users.password_changed_at`; tokens issued
  before it are rejected, so a reset signs out every other session.
- CSRF protection (double-submit cookie pattern) only applies to
  cookie-authenticated requests. Bearer-authenticated requests bypass CSRF.
- Emails are trimmed and lower-cased by the shared `emailSchema` everywhere.
- **No account enumeration.** Sign-up, forgot-password and resend-verification
  answer the same way whether or not the address has an account; login says only
  that the email and password don't match (and still runs a bcrypt compare for
  unknown emails, so timing matches). Verification and reset emails are limited
  to one a minute per account.
- Verification and reset tokens are stored as SHA-256 hashes and claimed with one
  atomic `UPDATE … RETURNING`, so a token works exactly once. Verifying an
  already-verified address again succeeds (links get opened twice).

### Configuration

Config is loaded via YAML + Zod validation from `config/local.yaml` or
`config/prod.yaml` (controlled by the `APP_ENV` env var). All fields can be
overridden with env vars prefixed `NEXIA_` where dots become underscores:

```
NEXIA_DB_PASSWORD               →  db.password
NEXIA_SERVER_CLIENT_IP_HEADER   →  server.client_ip_header
```

In release mode the loader refuses to start unless `server.jwt_secret` is at
least 32 characters, `server.cors_origins` is set, and `email.app_base_url` is
an `https://` URL.

Key config sections:

| Section | Fields |
|---|---|
| `server` | `port`, `mode`, `jwt_secret`, `jwt_expiry_minutes`, `cors_origins`, `cookie_domain`, `client_ip_header`, auth/chat rate limit fields |
| `db` | `host`, `port`, `user`, `password`, `name`, `ssl_mode`, `run_migrations`, `max_open_conns`, `conn_max_lifetime_minutes`, `idle_timeout_seconds` |
| `ai` | `gemini_api_key`, `opencode_api_key`, `opencode_base_url`, `chat_model`, `embedding_interval_seconds` |
| `email` | `resend_api_key`, `from_address`, `app_base_url` |

### Rate Limiting

Two in-memory token buckets, both built by `createRateLimiter` in
`middleware/rate-limit.ts`:

- **Auth** — the credential routes only (`signup`, `login`, `verify-email`,
  `resend-verification`, `forgot-password`, `reset-password`), keyed by client
  address. Behind a proxy the address comes from `server.client_ip_header`
  (production: `x-real-ip`, which Railway sets); `X-Forwarded-For` is never
  trusted, since a client can write it. `/auth/me` and `/auth/logout` are not
  limited.
- **Chat** — `POST /api/v1/chat`, keyed by **user id**, not address.

Requests beyond the burst are rejected with HTTP 429 and `RATE_LIMITED`.
This is in-memory only, so limits are per process, not global across replicas.

### API Endpoints

All routes are under `/api/v1`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/healthz` | No | Liveness probe |
| GET | `/readyz` | No | Readiness probe (checks DB) |
| POST | `/auth/signup` | No | Create account, sends verification email (same 201 answer either way) |
| POST | `/auth/login` | No | Authenticate, returns JWT + sets cookies |
| GET | `/auth/verify-email` | No | Verify email address (`?token=`) |
| POST | `/auth/resend-verification` | No | Send a fresh verification link (same answer either way) |
| POST | `/auth/forgot-password` | No | Send password reset email (same answer either way) |
| POST | `/auth/reset-password` | No | Reset password with token; signs out other sessions |
| GET | `/auth/me` | Yes | Returns current user info |
| POST | `/auth/logout` | Yes | Clears auth + CSRF cookies |
| POST | `/chat` | Yes | AI chat with tool-calling agent (streaming) |
| POST | `/profiles` | Yes | Create profile |
| GET | `/profiles` | Yes | List profiles (paginated, filterable) |
| GET | `/profiles/:id` | Yes | Get single profile |
| PUT | `/profiles/:id` | Yes | Full replacement — omitted optional fields are cleared; returns the profile |
| DELETE | `/profiles/:id` | Yes | Delete profile; 404 if missing or not yours |

`GET /profiles` accepts query params: `page` (default 1), `limit` (1–100,
default 24), `search` (name substring; `%` and `_` match literally),
`relationship_type`. Results are ordered by name, case-insensitively.

### Testing

**Framework:** Vitest, configured as four projects in the root
`vitest.config.ts`, plus Playwright for browser journeys.

| Project | Location | Needs |
|---|---|---|
| `shared` | `packages/shared/src/**/*.test.ts` | nothing |
| `api-unit` | `apps/api/src/**/*.test.ts` (colocated) | nothing |
| `api-integration` | `apps/api/tests/integration/**` | Docker |
| `web` | `apps/web/src/**/*.test.{ts,tsx}` (colocated; jsdom) | nothing |
| Playwright | `apps/web/e2e/**` | Postgres running |

```bash
npm test                   # every Vitest project
npm run test:unit          # fast: shared, api-unit, web — no containers
npm run test:integration   # containers only
npm run test:coverage      # every Vitest project, one coverage report, gate enforced
npm run test:e2e           # Playwright journeys
npm run test:all           # test:coverage, then test:e2e — the whole lot
npm run test:watch
```

**Web tests (`web` project).** Components and logic are tested in jsdom with
Testing Library, the way a person uses them: by role and accessible name, with
`user-event` for typing and keys. `apps/web/vitest.config.ts` holds the jsdom
and React settings; `apps/web/vitest.setup.ts` skips Framer animations and
stubs what jsdom lacks (`scrollIntoView`, `ResizeObserver`, `matchMedia`).
Network edges go through MSW (`apps/web/test/server.ts`, `mockApi()`), so
`ky`, React Query and the AI SDK's chat stream all run for real; the chat tests
answer with a genuine UI-message stream built with `createUIMessageStreamResponse`.
Fixtures live in `apps/web/test/` (imported as `@test/...`), outside `src`, so
they never count as subject code.

Two jsdom habits worth knowing: React Query tells observers on the next tick
(`waitFor` a status, don't read it straight after `act`); and Framer finishes
exits on real frames, so a test that fakes the clock should fake only
`setTimeout`/`clearTimeout` and return to real timers to watch something leave.

**Integration-first.** Anything that crosses a boundary is tested against real
infrastructure: Testcontainers starts one Postgres (`pgvector/pgvector:pg17`,
the same image as docker-compose) for the whole run, migrations are applied
once, and tests are isolated by truncating every public table between cases.
Integration files run sequentially, since they share that container. The
embedding worker's timer is not started in tests; `harness.embedPending()`
drains it on demand.

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

**Browser journeys (Playwright).** `apps/web/e2e/` drives the real stack in
Chrome: the API bundle with `APP_ENV=e2e` (`apps/api/config/e2e.yaml`: port
8181, its own `nexia_e2e` database, no AI or email keys) and a production build
of the web app on port 3100. The database is dropped and recreated on every
run. A `setup` project signs up the shared account, confirms it in SQL (the one
step a browser can't take — the link only goes to the API log) and saves the
signed-in state; the specs cover sign-in and its failures, making, finding,
editing and deleting a profile through the custom controls, the unsaved-changes
guard, the not-found note, and chat without a model. Postgres must be running.

```bash
npm run test:e2e                              # downloaded Chromium
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e    # or the installed Chrome
```

Assert on what people perceive: roles and accessible names, and toasts through
their live region (`e2e/support/page.ts`).

**Coverage gate:** 90% branches / functions / lines / statements, enforced by
`@vitest/coverage-istanbul` over `apps/api/src`, `packages/shared/src` and
`apps/web/src` together, in one report. Excluded: API bootstrap (`index.ts`,
`db/schema.ts`); the web app's route files (`src/app/**`, which the Playwright
journeys render for real); vendored `ai-elements`; and the two renderers that
need a real canvas or the Next image runtime (`exportProfilePdf.ts`,
`social-image.tsx`), which E2E exercises by downloading the PDF and fetching
the social image. Playwright is not instrumented for coverage. Do not hit the number by widening the exclude list.

### Error Handling Convention

Services throw a `ServiceError` (via the factories in `services/errors.ts`);
controllers do not catch it. `errorHandler` in `middleware/request-context.ts`,
registered with **`app.onError`**, maps it through `ERROR_RESPONSES`:

| ErrorKind | HTTP | Error Code |
|---|---|---|
| `validation` | 400 | `VALIDATION_ERROR` (message passed through) |
| `unauthorized` | 401 | `UNAUTHORIZED` |
| `email_not_verified` | 403 | `EMAIL_NOT_VERIFIED` |
| `not_found` | 404 | `NOT_FOUND` |
| `ai_unavailable` | 503 | `AI_UNAVAILABLE` |
| `email_unavailable` | 503 | `EMAIL_UNAVAILABLE` |

Outside the services: an oversized body is 413 `PAYLOAD_TOO_LARGE`, a rate limit
is 429 `RATE_LIMITED`, a failed CSRF check is 403 `CSRF_TOKEN_MISSING` or
`CSRF_TOKEN_INVALID`, and anything
else that escapes is logged with its stack and answered 500 `SERVER_ERROR` with
a generic message. There is deliberately no `ACCOUNT_NOT_FOUND` or
`EMAIL_CONFLICT`: both told a stranger whether an address has an account.

Error responses always have the shape:
```json
{ "error": { "code": "NOT_FOUND", "message": "Resource not found" } }
```

Keep the handler on `onError`, not in a middleware: Hono's dispatcher catches a
throwing handler itself and routes it straight to the error handler, so a
middleware wrapping `await next()` in try/catch never sees it.

### Data Models

**User**: `id`, `email` (unique, stored lower-case), `password` (bcrypt hashed),
`email_verified`, `password_changed_at`, timestamps.

**Profile**: Rich contact card for a person in the user's network. Belongs to a
`User`. Scalar text fields are `NOT NULL DEFAULT ''` (empty means unset), and
the lists live on the row itself — there are no child tables:

| Column | Type | Limit |
|---|---|---|
| `tags`, `political_views`, `food_restrictions`, `movie_genres`, `book_genres`, `hangout_places`, `quotes`, `favorite_memories` | `text[]` | per-field item count and length in `PROFILE_LIST_LIMITS` |
| `top_songs` | `jsonb` array of `{ name, artist }` | **3** (`MAX_TOP_SONGS`) |
| `associated_song` | `jsonb` `{ name, artist }` or null | 1 |

Every limit lives in `@nexia/shared` (`profile.ts`), so the API, the chat tools
and the form enforce the same ones. `profiles.revision` goes up by one on every
write; the embedding worker uses it to tell what is stale.

`RelationshipType` is an enum: `Friend`, `Family`, `Colleague`, `Classmate`,
`Crush`, `Ex`, `Mentor`, `Other`.

The zodiac sign is **derived on read** from `birthday` (`zodiacForBirthday` in
`services/zodiac.ts`, called by `repositories/profile-mapper.ts`). It is not
stored, and any `zodiac_sign` a client sends is dropped by the input schema.

**profile_embeddings**: one 3072-dim vector per profile, with the
`source_revision` it was computed from. It cascades with the profile, and only
the embedding service writes to it; the profile repository never does.

### Embedding Pipeline

There is no queue. `EmbeddingWorker` (`services/embedding-worker.ts`) runs in
the API process: every `ai.embedding_interval_seconds` (default 30), and
immediately after any profile write (`ProfileService` calls `wake()`), it finds
profiles whose embedding is missing or older than `profiles.revision`, flattens
each into text, calls `gemini-embedding-001`, and upserts the vector with that
revision. The upsert only ever moves a row forward, so a slow job can never
overwrite a newer vector. A profile whose embedding fails is retried with an
in-memory exponential backoff. Deleting a profile removes its vector by
cascade.

Because staleness is read from the database, nothing is lost on a restart or a
deploy, and there is no back-fill script: a profile created while Gemini was
not configured is embedded as soon as a key is present.

If `ai.gemini_api_key` is absent the worker does not start; all CRUD still
works, and semantic search is unavailable. If `ai.opencode_api_key` is absent,
`/chat` returns 503 `AI_UNAVAILABLE`.

### RAG Chat Flow

`POST /chat` → `ChatAgent`:
1. The request is validated as UI messages (`safeValidateUIMessages`) and only
   the last `CHAT_HISTORY_LIMIT` (40) are sent to the model. The AI SDK's
   `streamText` runs with tool calling, at most 8 steps and 2000 output tokens,
   and is aborted if the client disconnects.
2. The agent has 6 tools: `ragSearch`, `searchProfiles`, `getProfile`,
   `listProfiles`, `createProfile`, `updateProfile`, all scoped to the signed-in
   user.
3. `ragSearch` embeds the query with `gemini-embedding-001`, ranks
   `profile_embeddings` by cosine similarity for that user, then loads the
   **live** profiles for the top hits, so an answer never comes from a stale
   snapshot.
4. **Writes need the user's approval.** `createProfile` and `updateProfile` are
   `needsApproval: true`: the stream stops with an approval request, the chat UI
   shows the proposed change as a pinned note (Save / Not now), and the tool
   runs only when the approval comes back. Approvals are signed with an HMAC
   derived from the JWT secret, so a client cannot forge one.
5. The system prompt tells the agent to prefer RAG for fuzzy questions, to call
   the write tools directly (the approval step is the confirmation), and never
   to invent details.

### Database Migrations

Migrations live in `apps/api/drizzle/` using drizzle-kit naming. They run
automatically at server startup (unless `db.run_migrations` is false).
`0003`–`0005` moved the profile lists from child tables onto the row in three
steps — add the columns, back-fill them (a custom migration), then drop the old
tables — so a failure part-way leaves the old data in place.

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
- **No native browser UI.** No `<select>`, date input, `alert()`, `confirm()` or
  `title` tooltip: use `Select`, `DatePicker`, `ConfirmDialog`, `toast`, and
  `Tooltip`. Every overlay is a "pinned note" built on `overlays/Dialog`.
- **The logo** is `atoms/Logo` (`<Logo>` / `<LogoMark>`), drawn from
  `shared/brand/mark.ts`. The favicon, app icons, manifest icons and
  `docs/brand` are renders of that module: change it, then run
  `npm run brand -w web` (pass `http://localhost:3000` to refresh the README's
  social preview too). The Open Graph image is `shared/lib/social-image.tsx`.
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
  atoms/        — Button, Field, Input, Textarea, Select, DatePicker, SearchField,
                  Tooltip, Tape, Logo, BackButton, SignedInRedirect
  overlays/     — Dialog (the one modal: focus trap, scrim, pinned-note sheet)
  layout/       — PageShell (container), AuthCard (unauthenticated page shell)
  molecules/    — Navbar, CardProfilePreview, ConfirmDialog, QuoteModal, StatusNote

features/
  auth/               — api.ts, ResendVerification, pending-email (sessionStorage)
  chat/api.ts         — Transport (DefaultChatTransport; a 401 goes to sign-in)
  chat/chat-provider  — ChatProvider (one Chat per dashboard session) + useNexiaChat
  chat/components/    — ChatHeader, ChatMessage, ChatEmptyState, ChatComposer,
                        ToolActivity, WriteProposal, ChatProfileCard
  chat/lib/           — Tool metadata, error descriptions, markdown overrides
  profiles/api.ts     — Profile CRUD calls
  profiles/hooks.ts   — Query keys and the list / detail / mutation hooks
  profiles/form.ts    — Form schema (built from the shared schema) and mapping
  profiles/sections.ts— Which fields each sheet section holds, labels, colours
  profiles/components — ProfileForm, ProfileSheet, SheetSection, FormActionBar,
                        Avatar, ZodiacIcon, fields/ (ChipList, TopSongs, TheirSong)

shared/
  api/                — client.ts (the ky instance), cookies.ts (CSRF cookie)
  brand/mark.ts       — The logo's geometry and colours (single source)
  hooks/              — useFocusTrap, useDismiss, useIsClamped, useLeaveGuard
  lib/                — dates.ts (all date parsing/formatting), social-image.tsx
  providers/          — React Query + MotionConfig wrapper
  ui/                 — toast, motion (EASE_OUT, SETTLE, enter), AIIcons
```

There is no `components/ui/` directory. The shadcn primitives were removed along
with the vendored `ai-elements/prompt-input.tsx` that was their only consumer;
the chat composer is now `features/chat/components/chat-composer.tsx`.

### Data Fetching

All server state uses **TanStack Query** (`@tanstack/react-query`). Mutations
invalidate relevant query keys on success. Do not use raw `useState` + `useEffect`
for server data — use `useQuery` / `useMutation`. A side-effecting GET fired on
page load (confirming an email) is a `useQuery`, not a mutation in an effect: a
mutation started from an effect loses its observer under React's development
double-mount and never leaves "pending".

The profile list keeps its search and relationship filter in the URL
(`?q=&type=`), so a filtered view survives navigation and can be bookmarked.

### Forms

Forms use **React Hook Form** + **Zod** via `@hookform/resolvers/zod`. The
profile form's schema is assembled from the shared `profileInputSchema`, so its
limits cannot drift from the API's. List fields are plain string arrays edited
as chips; what is typed in an add box but not yet added is kept in the form
(`drafts`) and folded in on save, so it is never silently lost. Leaving with
unsaved changes asks first (`useLeaveGuard` + `ConfirmDialog`).

### API Client

`src/shared/api/client.ts` exports a pre-configured `ky` instance:
- Base URL from `NEXT_PUBLIC_BACKEND_URL` env var — browser calls the backend
  **directly** (no Vercel proxy). Falls back to `http://localhost:8080`.
- `credentials: "include"` so the `nexia_token` cookie is sent on every request.
- Sends `X-CSRF-Token` from the CSRF cookie on writes; a 401 outside `/auth/*`
  sends the browser to `/login?next=…`. `retry: 0` — React Query owns retries.

### Chat

`ChatProvider` (in the dashboard layout) holds one AI SDK `Chat` for the
session, so a conversation survives moving between pages; `useNexiaChat()`
reads it. The chat sends automatically once every pending write has an answer
(`lastAssistantMessageIsCompleteWithApprovalResponses`). Tool calls render
through `ToolActivity`: lookups as quiet notes or profile cards, and writes as a
`WriteProposal` note the user saves or declines. A finished reply invalidates
the profile queries, so a change made in chat shows up everywhere.

### Auth

`AuthContext` (root layout) exposes `status` (`loading`, `signed-in`,
`signed-out`, or `unreachable` when the API cannot be reached), `signedIn`,
`signOut` and `retry`. The session is a React Query (`["session"]`) against
`/auth/me`. The `(dashboard)/layout.tsx` enforces auth for all dashboard routes
— there is no separate `ProtectedRoute` component — and sends a signed-out
visitor to `/login?next=…`.

---

## Development Workflows

### Prerequisites

- Docker + Docker Compose (also required for the integration tests)
- Node 24 (see `.nvmrc`) and npm
- A Google Gemini API key (optional; required for AI/chat features)

### Local Development (hybrid: infra in Docker, services native)

```bash
# Start only Postgres
docker compose up -d postgres
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
npm run test:e2e           # Browser journeys (needs Postgres running)

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
| `./nexia.sh infra` | Restart Postgres (data preserved) |
| `./nexia.sh wipe` | Destroy + recreate the Postgres volume (data lost) |
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

### Brand Assets

The favicon, app icons, manifest icons and `docs/brand` are rendered from
`apps/web/src/shared/brand/mark.ts`:

```bash
npm run brand -w web                          # icons and docs/brand SVGs
npm run brand -w web -- http://localhost:3000 # also the README social preview
```

### Emails in development

With no `email.resend_api_key`, nothing is sent: the API logs each
verification and reset link instead (`email disabled; verification link`), so
sign-up can be finished locally from the API log.

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
6. **Zodiac sign**: never store or accept a zodiac sign; it is derived from
   `birthday` when a profile is read (`zodiacForBirthday`).
7. **Limits live in `@nexia/shared`**: list sizes, text lengths and the three
   top songs are enforced by the shared schemas, so the API, the chat tools and
   the form agree. Don't re-check them in a service.
8. **Tests**: integration-first against real Postgres via testcontainers;
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
11. **Structured logging**: all logging goes through pino. Use child loggers for
   components. Never use `console.log` in production code.
12. **Graceful degradation**: the embedding pipeline is entirely optional.
    Embedding failures are logged and retried with backoff; they never fail the
    profile write that triggered them.

### Frontend (TypeScript / Next.js)

1. **App Router only**: all pages go in `src/app/`. No Pages Router patterns.
2. **Server state via React Query**: avoid `useState`+`useEffect` for API data.
3. **Form validation**: React Hook Form + Zod schema. No ad-hoc validation.
4. **Atomic component structure**: atoms → molecules → features → pages.
5. **Single ky instance**: always use `src/shared/api/client.ts`. Don't
   create additional ky/fetch instances.
6. **Cookie auth**: the frontend relies on `withCredentials: true`. Don't
   switch to localStorage tokens without a coordinated backend change.
7. **TypeScript strict**: don't use `any`. Types that describe API data come from
   `@nexia/shared` directly; don't re-alias them in the web app.
8. **Test what you build**: a component or hook gets a colocated `*.test.tsx`
   that drives it by role and name; a new page or flow gets a Playwright
   journey in `apps/web/e2e/`.
9. **Lint and format after every change**: run `npm run lint && npm run format`
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
| `NEXIA_SERVER_CLIENT_IP_HEADER` | `server.client_ip_header` | _(empty: socket address)_ | Behind a proxy (prod: `x-real-ip`) |
| `NEXIA_DB_HOST` | `db.host` | `localhost` | Yes |
| `NEXIA_DB_PORT` | `db.port` | `5432` | No |
| `NEXIA_DB_USER` | `db.user` | `postgres` | Yes |
| `NEXIA_DB_PASSWORD` | `db.password` | `password` | **Yes (prod)** |
| `NEXIA_DB_NAME` | `db.name` | `nexia_db` | Yes |
| `NEXIA_DB_SSL_MODE` | `db.ssl_mode` | `disable` | No |
| `NEXIA_AI_GEMINI_API_KEY` | `ai.gemini_api_key` | _(empty)_ | For AI/chat |
| `NEXIA_AI_OPENCODE_API_KEY` | `ai.opencode_api_key` | _(empty)_ | For chat |
| `NEXIA_AI_OPENCODE_BASE_URL` | `ai.opencode_base_url` | `https://opencode.ai/zen/v1` | No |
| `NEXIA_AI_CHAT_MODEL` | `ai.chat_model` | `space-bunny-free` | No |
| `NEXIA_AI_EMBEDDING_INTERVAL_SECONDS` | `ai.embedding_interval_seconds` | `30` | No |
| `NEXIA_EMAIL_RESEND_API_KEY` | `email.resend_api_key` | _(empty)_ | For email |
| `NEXIA_EMAIL_APP_BASE_URL` | `email.app_base_url` | `http://localhost:3000` | No |

### Frontend

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Backend base URL (e.g., `http://localhost:8080` locally, `http://backend:8080` in Docker) |
