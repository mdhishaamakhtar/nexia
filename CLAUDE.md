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
| Backend | Go 1.25, Gin, GORM, golang-migrate |
| Database | PostgreSQL 17 + pgvector extension |
| Queue | Redis 7 + Asynq |
| AI / Embeddings | Google Gemini (`gemini-2.5-flash` for chat, `gemini-embedding-001` for 3072-dim embeddings) |
| Container | Docker + Docker Compose |

---

## Repository Layout

```
nexia/
├── backend/                  # Go backend service
│   ├── cmd/
│   │   ├── server/main.go    # HTTP server entrypoint
│   │   └── sync/main.go      # One-shot embedding back-fill utility
│   ├── config/
│   │   ├── local.yaml        # Local dev config
│   │   └── prod.yaml         # Production config
│   ├── docs/swagger/         # Auto-generated Swagger docs (swag)
│   ├── internal/
│   │   ├── ai/               # Gemini + pgvector clients
│   │   ├── config/           # Config struct + Viper loader
│   │   ├── controllers/      # Gin HTTP handlers
│   │   ├── middleware/       # JWT auth middleware
│   │   ├── models/           # GORM models (User, Profile, child tables)
│   │   ├── queue/            # Asynq producer + consumer (task handlers)
│   │   ├── repositories/     # GORM data access layer
│   │   ├── routes/           # Router setup (CORS, middleware wiring)
│   │   ├── services/         # Business logic (auth, profiles, chat)
│   │   └── utils/            # JWT helpers, response helpers
│   ├── migrations/           # SQL migration files (golang-migrate)
│   ├── pkg/db/               # DB connection + migration runner
│   └── tests/
│       └── integration/      # Integration tests (testcontainers-backed)
│   # Unit tests are colocated with the code they cover (e.g.
│   # internal/services/*_test.go).
├── frontend/                 # Next.js application
│   └── src/
│       ├── app/              # Next.js App Router pages
│       ├── components/       # Atomic UI components (atoms, molecules, guards)
│       ├── context/          # React context (AuthContext)
│       ├── features/         # Feature-sliced modules (auth, chat, profiles)
│       ├── lib/              # Legacy API helpers
│       └── shared/           # Shared API client, types, providers, UI
├── docker-compose.yml        # Full-stack local Docker environment
└── nexia.sh                  # Dev CLI helper (wraps docker compose)
```

---

## Backend Architecture

### Dependency Injection Pattern

The backend uses **constructor-based DI**. Nothing is global except the
`db.DB` GORM handle.

```
main.go
  → Repository  (concrete struct in repositories package)
  → Service     (concrete struct; holds repository/client interfaces)
  → Controller  (concrete struct; holds concrete service pointer)
  → Router
```

**Repository interfaces** are defined in the **service package** (the consuming
package), not in the repository package. The concrete structs in `repositories/`
implement them implicitly via Go structural typing.

**Services** store their dependencies (repos, queue, AI clients) as interface
types, which is what allows unit tests to inject local fake structs without
touching the real DB or network. Each test file defines its own `fakeXRepo` /
`fakeXQueue` types that satisfy the relevant service-package interface.

**Controllers** hold a plain pointer to the concrete service struct
(`*services.ProfileService`, etc.) — there is no service interface at the
controller layer.

### Request Flow

```
HTTP Request
  → CORS middleware (gin-contrib/cors)
  → AuthMiddleware (JWT validation, sets userID in Gin context)
  → Controller (bind JSON, extract userID from context)
  → Service (business logic, validation)
  → Repository (GORM queries)
  → Response (utils.RespondWithSuccess / utils.RespondWithError)
```

### Authentication

- **Separate endpoints**: `POST /api/v1/auth/signup` (create account) and
  `POST /api/v1/auth/login` (authenticate). Email verification is required
  before login succeeds.
- JWT tokens are HS256-signed, configurable expiry (default 1440 min = 24 h).
- Tokens are accepted via `Authorization: Bearer <token>` header **or** the
  `nexia_token` HTTP cookie (the frontend uses the cookie path).
- `middleware.GetUserID(c)` extracts the `uint64` userID from the Gin context.

### Configuration

Config is loaded via **Viper** from `config/local.yaml` or `config/prod.yaml`
(controlled by the `APP_ENV` env var). All fields can be overridden with env
vars prefixed `NEXIA_` where dots become underscores:

```
NEXIA_DB_PASSWORD  →  db.password
NEXIA_AI_REDIS_URL →  ai.redis_url
```

Key config fields:

| Field | Purpose |
|---|---|
| `server.jwt_secret` | HMAC secret for JWT signing |
| `server.jwt_expiry_minutes` | Token TTL |
| `server.cors_origins` | Allowed CORS origins (list) |
| `server.cookie_domain` | Cookie domain (e.g. `.hishaam.dev` for cross-subdomain auth) |
| `db.*` | PostgreSQL connection details |
| `ai.gemini_api_key` | Gemini API key (optional; RAG disabled if empty) |
| `ai.redis_url` | Redis URL for Asynq queue (optional; RAG disabled if empty) |

### Rate Limiting

Auth and chat routes use in-memory per-IP token buckets backed by `golang.org/x/time/rate`.

Auth route family:

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`

Chat route family:

- `POST /api/v1/chat`

Config fields:

| Field | Purpose |
|---|---|
| `server.auth_rate_limit_requests` | Token refill budget for auth endpoints |
| `server.auth_rate_limit_window_seconds` | Auth refill window in seconds |
| `server.auth_rate_limit_burst` | Auth burst size |
| `server.chat_rate_limit_requests` | Token refill budget for chat endpoint |
| `server.chat_rate_limit_window_seconds` | Chat refill window in seconds |
| `server.chat_rate_limit_burst` | Chat burst size |

Implementation notes:

- The shared limiter engine lives in `internal/middleware/rate_limit.go`.
- Route-specific defaults live in `internal/middleware/auth_rate_limit.go` and `internal/middleware/chat_rate_limit.go`.
- Requests beyond the burst are rejected with HTTP 429 and `RATE_LIMITED`.
- This is in-memory only, so limits are per process, not global across replicas.

### API Endpoints

All routes are under `/api/v1`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/healthz` | No | Liveness probe |
| GET | `/readyz` | No | Readiness probe |
| POST | `/auth` | No | Login or signup; returns JWT |
| GET | `/auth/me` | Yes | Returns current user info |
| POST | `/auth/logout` | Yes | Logout |
| POST | `/chat` | Yes | RAG-powered AI chat query |
| POST | `/profiles` | Yes | Create profile |
| GET | `/profiles` | Yes | List profiles (paginated, filterable) |
| GET | `/profiles/:id` | Yes | Get single profile |
| PUT | `/profiles/:id` | Yes | Full-overwrite update |
| DELETE | `/profiles/:id` | Yes | Delete profile |
| GET | `/swagger/*` | No | Swagger UI |

`GET /profiles` accepts query params: `page`, `limit`, `search` (name substring),
`relationship_type`.

### Testing

Recommended commands:

```bash
cd backend
go test -count=1 -v ./...
```

```bash
cd backend
go test -count=1 -v ./internal/... ./pkg/...
```

```bash
cd backend
go test -count=1 -v ./tests/integration/...
```

Coverage commands:

```bash
cd backend
APP_COVERPKG=$(go list ./... | grep -Ev '(^nexia-backend/cmd/|^nexia-backend/docs/swagger$|^nexia-backend/tests/integration$|^nexia-backend/internal/app$)' | paste -sd, -)
go test -count=1 -v -coverpkg="$APP_COVERPKG" ./... -coverprofile=coverage.packages.out
```

```bash
cd backend
APP_COVERPKG=$(go list ./... | grep -Ev '(^nexia-backend/cmd/|^nexia-backend/docs/swagger$|^nexia-backend/tests/integration$|^nexia-backend/internal/app$)' | paste -sd, -)
go test -count=1 -v -coverpkg="$APP_COVERPKG" ./internal/... ./pkg/... -coverprofile=coverage.unit.out
```

### Error Handling Convention

Controllers use `respondWithServiceError(c, err)` which maps service-layer
sentinel errors to HTTP status codes:

| Sentinel | HTTP |
|---|---|
| `services.ErrUnauthorized` | 401 |
| `services.ErrValidation` | 400 |
| `services.ErrNotFound` / `gorm.ErrRecordNotFound` | 404 |
| `services.ErrAIUnavailable` | 503 |
| anything else | 500 |

Error responses always have the shape:
```json
{ "error": { "code": "NOT_FOUND", "message": "Resource not found" } }
```

Success responses return the data directly (no wrapping envelope).

### Data Models

**User**: `id`, `username` (unique), `password` (bcrypt hashed), timestamps.

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
manually. `applyDerivedZodiac` in `profile_service.go` handles this on every
create/update.

**profile_embeddings**: pgvector table storing a 3072-dim embedding and a
full JSONB snapshot of the profile. Managed exclusively by the async queue
worker, never by the profile repository.

### Asynchronous Embedding Pipeline

When a profile is created or updated, the service enqueues a `task:embedding`
Asynq task. The worker (goroutine in the same process) picks it up, flattens
the full profile (with all preloaded associations) into text, calls
`gemini-embedding-001`, then upserts the result into `profile_embeddings`.

On profile delete, a `task:deletion` task removes the vector row asynchronously.

If `ai.redis_url` or `ai.gemini_api_key` is absent, the queue and Gemini
client are nil. The service layer skips embedding gracefully — all CRUD still
works, but `/chat` returns 503.

### RAG Chat Flow

`POST /chat` → `ChatService.Chat`:
1. Generate a query embedding via `gemini-embedding-001`.
2. Search `profile_embeddings` with cosine similarity (`<=>` operator), filtered
   by `user_id`, returning top-5 results with their JSONB payload.
3. Build a context string from the payloads.
4. Call `gemini-2.5-flash` with the context injected into the system prompt.

### Database Migrations

Migrations live in `backend/migrations/` using golang-migrate naming:
`NNNNNN_<description>.up.sql` / `.down.sql`. They run automatically at server
startup. Always create paired up/down files. Never edit existing migration
files — add a new numbered one instead.

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
  atoms/        — Primitive UI: Button, Input, Chip
  molecules/    — Composed UI: Navbar, CardProfilePreview, ConfirmDialog, QuoteModal, SectionWrapper

features/
  auth/api.ts         — Auth API calls
  chat/api.ts         — Chat API calls
  profiles/api.ts     — Profile CRUD API calls
  profiles/components — ProfileForm, FieldArrayInput, ProfileFormSection, ZodiacIcon

shared/
  api/client.ts       — ky instance (base URL + credentials + CSRF/401 hooks)
  types/              — TypeScript types: Profile, API response shapes
  providers/          — React Query QueryClientProvider wrapper
  ui/                 — Toast, AIIcons
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

### Auth

`AuthContext` (root layout) manages `isAuthenticated`, `login`, and `logout`.
The `(dashboard)/layout.tsx` enforces auth for all dashboard routes — there is
no separate `ProtectedRoute` component.

---

## Development Workflows

### Prerequisites

- Docker + Docker Compose
- Go 1.25+
- Bun 1.x (package manager and runtime for the frontend)
- A Google Gemini API key (optional; required for AI/chat features)

### Local Development (hybrid: infra in Docker, services native)

```bash
# Start only Postgres + Redis
docker compose up -d postgres redis
# OR
./nexia.sh infra

# Run backend (from backend/)
go run ./cmd/server/main.go

# Run frontend (from frontend/)
bun install
bun run dev        # http://localhost:3000
```

### Full Docker Stack

```bash
GEMINI_API_KEY=your_key_here ./nexia.sh ra   # build + start everything
# Frontend accessible at http://localhost:3000
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
cd backend

# Unit tests — colocated with the code under internal/... (no external deps)
go test ./internal/...

# Integration tests — spin up Postgres + Redis via testcontainers-go
# (Docker daemon must be reachable)
go test ./tests/integration/...

# All tests
go test ./...

# Coverage profile + summary
go test -coverprofile=cover.out -coverpkg=./internal/...,./pkg/... ./...
go tool cover -func=cover.out
```

### Frontend Linting / Formatting

```bash
cd frontend
bun run lint      # ESLint + Prettier auto-fix
bun run format    # Prettier write
```

### Regenerating Swagger Docs

```bash
cd backend
go tool swag init -g cmd/server/main.go -o docs/swagger --parseDependency --parseInternal
```

Run this after adding or modifying Swagger annotations on any controller.

### Embedding Back-fill

If profiles exist without embeddings (e.g., after Redis was wiped or Gemini
was not configured at creation time), re-queue all profiles:

```bash
cd backend
go run ./cmd/sync/main.go
```

---

## Key Conventions

### Backend (Go)

1. **Thin controllers**: controllers only bind input, call the service, and
   write the response. Business logic belongs in the service layer.
2. **Interface-first DI**: interfaces are defined in the consuming package
   (the service defines `ProfileRepository`, not the repository package).
3. **Sentinel errors**: use the sentinel errors in `internal/services/errors.go`.
   Add new ones there if needed. Never use raw `errors.New` inline for errors
   that cross a layer boundary.
4. **No hard-coded secrets**: use env vars with the `NEXIA_` prefix.
5. **Migration discipline**: always write paired up/down SQL. Never modify a
   merged migration file — add a new numbered one.
6. **Zodiac sign**: never set `ZodiacSign` directly on a Profile; it is always
   derived by `applyDerivedZodiac` in the service layer from `Birthday`.
7. **Top songs limit**: max 3 is enforced in the service layer, not the DB or
   controller.
8. **Swagger annotations**: all public endpoints must have godoc Swagger
   comments. Re-run `go tool swag init` after changes.
9. **Unit tests**: colocated with the code they cover (e.g.
   `internal/services/profile_service_test.go`). Use the fake/stub pattern —
   no real DB or network in unit tests. Integration tests live under
   `tests/integration/` and use testcontainers-go for Postgres and Redis.

### Frontend (TypeScript / Next.js)

1. **App Router only**: all pages go in `src/app/`. No Pages Router patterns.
2. **Server state via React Query**: avoid `useState`+`useEffect` for API data.
3. **Form validation**: React Hook Form + Zod schema. No ad-hoc validation.
4. **Atomic component structure**: atoms → molecules → features → pages.
5. **Single ky instance**: always use `src/shared/api/client.ts`. Don't
   create additional ky/fetch instances.
6. **Cookie auth**: the frontend relies on `withCredentials: true`. Don't
   switch to localStorage tokens without a coordinated backend change.
7. **TypeScript strict**: don't use `any`. Define types in `src/shared/types/`.
8. **Lint and format after every change**: run `bun run lint && bun run format` from `frontend/` after any frontend file is modified. Do this before marking a task complete or committing.

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
| `NEXIA_SERVER_JWT_SECRET` | `server.jwt_secret` | `super-secret-key-for-dev` | **Yes (prod)** |
| `NEXIA_SERVER_PORT` | `server.port` | `8080` | No |
| `NEXIA_DB_HOST` | `db.host` | `localhost` | Yes |
| `NEXIA_DB_PORT` | `db.port` | `5432` | No |
| `NEXIA_DB_USER` | `db.user` | `postgres` | Yes |
| `NEXIA_DB_PASSWORD` | `db.password` | `password` | **Yes (prod)** |
| `NEXIA_DB_NAME` | `db.name` | `nexia_db` | Yes |
| `NEXIA_DB_SSL_MODE` | `db.ssl_mode` | `disable` | No |
| `NEXIA_AI_GEMINI_API_KEY` | `ai.gemini_api_key` | _(empty)_ | For AI/chat |
| `NEXIA_AI_REDIS_URL` | `ai.redis_url` | `127.0.0.1:6379` | For AI/chat |

### Frontend

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | Backend base URL (e.g., `http://localhost:8080` locally, `http://backend:8080` in Docker) |
