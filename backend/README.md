# 🚀 Nexia Backend

> The high-performance engine powering Nexia with RAG-based intelligence.

Nexia Backend is a production-grade REST API built using **Go**, **Gin**, and **GORM**. It orchestrates complex AI workflows, manages persistent data in PostgreSQL, and handles background tasks with Redis.

---

## 🛠 Tech Stack

[![Go](https://img.shields.io/badge/Go-1.25-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![Gin](https://img.shields.io/badge/Gin-1.11-009688?style=for-the-badge&logo=gin&logoColor=white)](https://gin-gonic.com/)
[![Fx](https://img.shields.io/badge/Uber_Fx-1.24-232F3E?style=for-the-badge&logo=uber&logoColor=white)](https://github.com/uber-go/fx)
[![Zap](https://img.shields.io/badge/Uber_Zap-1.27-232F3E?style=for-the-badge&logo=uber&logoColor=white)](https://github.com/uber-go/zap)
[![GORM](https://img.shields.io/badge/GORM-1.31-1A237E?style=for-the-badge&logo=go&logoColor=white)](https://gorm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![pgvector](https://img.shields.io/badge/pgvector-PG17_Extension-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Asynq](https://img.shields.io/badge/Asynq-0.25.1-CE412B?style=for-the-badge&logo=go&logoColor=white)](https://github.com/hibiken/asynq)
[![GORM PostgreSQL Driver](https://img.shields.io/badge/gorm.io/driver/postgres-1.5.11-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://pkg.go.dev/gorm.io/driver/postgres)
[![Google GenAI SDK](https://img.shields.io/badge/google.golang.org/genai-1.0.0-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://pkg.go.dev/google.golang.org/genai)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

---

## ✨ Core Components

### 🧠 RAG Intelligence

- **pgvector Integration**: Stores profile embeddings directly in PostgreSQL using the `vector(3072)` type.
- **Exact Search**: Uses exact cosine similarity (`<=>` operator) for maximum precision. Vector indexes are skipped to support the high-dimensional (3072) output of Gemini's latest embedding models.
- **Full Payload in pgvector**: Each embedding row also stores a complete JSONB snapshot of the profile (all fields + associations) for instant context retrieval — no extra DB round trips.
- **Gemini 2.5 Flash**: Generates insights and responses based on filtered friend data using the latest official Go SDK (`google.golang.org/genai`).

### 👷 Async Workers

- **Asynq & Redis**: Handles the heavy lifting of generating embeddings in the background.
- **Task Producer/Consumer**: Profiles are automatically queued for indexing upon creation or update.

### 📋 API Layer

- **Gin Framework**: Low-latency request routing.
- **JWT Auth**: Secure middleware for user sessions.
- **Swagger**: Automated documentation available at `/api/v1/swagger/index.html`.

---

## ⚙️ Setup & Installation

### Option A: Full Docker (Recommended)

From the root directory, you can run the entire stack:

```bash
export GEMINI_API_KEY=your_key_here
docker-compose up --build
```

### Option B: Manual Development

1. **Infrastructure**:
   Ensure Docker is running and launch dependencies:

   ```bash
   docker-compose up -d postgres redis
   ```

2. **Configuration**:
   Edit `config/local.yaml`:
   - Set `gemini_api_key`.
   - Backend will use `localhost` by default for infrastructure if running manually.

3. **Database Setup**:
   The backend automatically runs migrations on startup (including enabling the `vector` extension and creating the `profile_embeddings` table).

4. **Run Server**:

   ```bash
   cd backend
   go run cmd/server/main.go
   ```

## 🔐 Environment Variables

Configuration loads from `config/local.yaml` by default, switches file with `APP_ENV`, and then allows `NEXIA_*` environment variables to override YAML values.

### App Selection

| Variable | Expected Value | Notes |
| --- | --- | --- |
| `APP_ENV` | config file name like `local`, `prod` | Selects `config/<APP_ENV>.yaml`. Defaults to `local`. |

### Server

| Variable | Expected Value | Default | Notes |
| --- | --- | --- | --- |
| `NEXIA_SERVER_PORT` | integer | `8080` | HTTP server port. |
| `NEXIA_SERVER_MODE` | `debug`, `test`, or `release` | from config file | Gin mode and logger environment field. |
| `NEXIA_SERVER_JWT_SECRET` | non-empty string | none in prod | Required in production. |
| `NEXIA_SERVER_JWT_EXPIRY_MINUTES` | integer | `1440` local, `60` prod | JWT cookie/token lifetime in minutes. |
| `NEXIA_SERVER_CORS_ORIGINS` | comma-separated origins | from config file | Example: `https://app.example.com,https://admin.example.com` |
| `NEXIA_SERVER_COOKIE_DOMAIN` | cookie domain string | empty | Example: `.example.com` |

### Database

| Variable | Expected Value | Default | Notes |
| --- | --- | --- | --- |
| `NEXIA_DB_HOST` | hostname | from config file | Postgres host. |
| `NEXIA_DB_PORT` | integer | `5432` | Postgres port. |
| `NEXIA_DB_USER` | username | from config file | Postgres user. |
| `NEXIA_DB_PASSWORD` | password string | from config file | Postgres password. |
| `NEXIA_DB_NAME` | database name | from config file | Postgres database name. |
| `NEXIA_DB_SSL_MODE` | Postgres sslmode string | `disable` local, `require` prod | Example: `disable`, `require`, `verify-full`. |
| `NEXIA_DB_RUN_MIGRATIONS` | `true` or `false` | `true` | Set to `false` in production if migrations run separately. |
| `NEXIA_DB_MAX_IDLE_CONNS` | integer | `10` | SQL pool idle connections. |
| `NEXIA_DB_MAX_OPEN_CONNS` | integer | `50` | SQL pool max open connections. |
| `NEXIA_DB_CONN_MAX_LIFETIME_MINUTES` | integer | `60` | SQL connection max lifetime in minutes. |

### AI / Queue

| Variable | Expected Value | Default | Notes |
| --- | --- | --- | --- |
| `NEXIA_AI_GEMINI_API_KEY` | API key string | empty | Empty disables Gemini-backed features. |
| `NEXIA_AI_REDIS_URL` | Redis URI or host:port | `127.0.0.1:6379` | Used by Asynq queue client/worker. |

### Email

| Variable | Expected Value | Default | Notes |
| --- | --- | --- | --- |
| `NEXIA_EMAIL_RESEND_API_KEY` | API key string | empty | Empty disables actual email sending. |
| `NEXIA_EMAIL_FROM_ADDRESS` | RFC 5322 mailbox string | `Nexia <noreply@nexia.hishaam.dev>` | Sender address used for emails. |
| `NEXIA_EMAIL_APP_BASE_URL` | absolute app URL | from config file | Example: `https://nexia.app` |

### 📖 API Documentation

Swagger UI is available locally at:
  `http://localhost:8080/api/v1/swagger/index.html`

To regenerate or update the Swagger documentation, run:

```bash
cd backend
go tool swag init -g cmd/server/main.go -o docs/swagger --parseDependency --parseInternal
```

---

## ✅ Testing

### Format Code (`go fmt`)

```bash
cd backend
go fmt ./...
```

### Run Tests

```bash
cd backend
go test ./...
```

### Generate Coverage

```bash
cd backend
go test \
  -coverpkg=$(go list ./internal/... | grep -Ev 'internal/(app|logging|ai)' | paste -sd, -) \
  ./... -coverprofile=coverage.packages.out
```

Excluded packages: `internal/app` (fx DI wiring), `internal/logging` (zap/gorm/asynq adapters), `internal/ai` (Gemini SDK calls) — testing these is testing the libraries, not application logic.

### View Coverage

```bash
cd backend
go tool cover -func=coverage.packages.out
```

---

## 🔗 Links

- [Root Project README](../README.md)
- [Frontend Documentation](../frontend/README.md)
