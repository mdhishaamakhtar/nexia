# Nexia Backend

Nexia Backend is a REST API service for a personal digital slambook, built with Go, Gin, and GORM.

## Features
- **Profile Management**: CRUD operations for user profiles.
- **Authentication**: JWT-based secure access.
- **Zodiac Derivation**: Automatic zodiac calculation.
- **Database**: MySQL with GORM managed migrations.

## Prerequisites
- **Go**: Version 1.25 or higher
- **MySQL**: Version 8.0 or higher

## Setup & Configuration

1. **Database Setup**:
   Ensure you have a MySQL server running and create the database:
   ```sql
   CREATE DATABASE nexia_db;
   ```

2. **Configuration**:
   - The application uses `config/local.yaml` for local development.
   - You can also configure via environment variables (e.g., `NEXIA_DB_PASSWORD`).

3. **Install Dependencies**:
   ```bash
   go mod download
   ```

## Running the Server

### Development Mode

Run the server directly using Go:

```bash
go run cmd/server/main.go
```

The server will start on port `8080`.

### Run the Application

#### 1. Start Infrastructure (RAG Support)
Nexia now uses **Qdrant** (Vector DB) and **Redis** (Task Queue) for AI features.
```bash
# In project root
docker-compose up -d
```

#### 2. Configuration
Update `config/local.yaml` or set Environment Variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXIA_AI_GEMINI_API_KEY` | **Required** Google Gemini API Key | - |
| `NEXIA_AI_REDIS_URL` | Redis Connection String | `127.0.0.1:6379` |
| `NEXIA_AI_QDRANT_HOST` | Qdrant Host | `localhost` |
| `NEXIA_AI_QDRANT_PORT` | Qdrant Port | `6334` |

#### 3. Run Development Server
```bash
go run cmd/server/main.go
```

#### 4. Sync Existing Data (First-Time Users)
If you have existing profiles in your database that hasn't been indexed by the AI yet, run the sync utility:
```bash
go run cmd/sync/main.go
```
This utility will process all existing profiles and generate embeddings for them in Qdrant.

### API Documentation
Swagger docs available at: `http://localhost:8080/api/v1/swagger/index.html`
Generate docs: `swag init -g cmd/server/main.go -o docs/swagger` documentation, run:

```bash
go run github.com/swaggo/swag/cmd/swag init -g cmd/server/main.go -o docs/swagger --parseDependency --parseInternal
```
