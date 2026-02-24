# 🚀 Nexia Backend

> The high-performance engine powering Nexia with RAG-based intelligence.

Nexia Backend is a production-grade REST API built using **Go**, **Gin**, and **GORM**. It orchestrates complex AI workflows, manages persistent data in PostgreSQL, and handles background tasks with Redis.

---

## 🛠 Tech Stack

[![Go](https://img.shields.io/badge/Language-Go_1.25+-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_17-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![pgvector](https://img.shields.io/badge/Vector_Search-pgvector-336791?style=flat-square&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Redis](https://img.shields.io/badge/Queue-Redis-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini_2.5_Flash-8E75C2?style=flat-square&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)

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
   go run cmd/server/main.go
   ```

### 📖 API Documentation

Swagger UI is available locally at:
`http://localhost:8080/api/v1/swagger/index.html`

To regenerate or update the Swagger documentation, run:

```bash
go run github.com/swaggo/swag/cmd/swag init -g cmd/server/main.go -o docs/swagger --parseDependency --parseInternal
```

---

## 🔗 Links

- [Root Project README](../README.md)
- [Frontend Documentation](../frontend/README.md)
