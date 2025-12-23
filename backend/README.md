# 🚀 Nexia Backend
> The high-performance engine powering Nexia with RAG-based intelligence.

Nexia Backend is a production-grade REST API built using **Go**, **Gin**, and **GORM**. It orchestrates complex AI workflows, manages persistent data in MySQL, and handles background tasks with Redis.

---

## 🛠 Tech Stack

[![Go](https://img.shields.io/badge/Language-Go_1.25+-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev/)
[![MySQL](https://img.shields.io/badge/Database-MySQL_8.0-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Qdrant](https://img.shields.io/badge/Vector_DB-Qdrant-black?style=flat-square&logo=qdrant&logoColor=white)](https://qdrant.tech/)
[![Redis](https://img.shields.io/badge/Queue-Redis-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Google Gemini](https://img.shields.io/badge/AI-Gemini_Pro-8E75C2?style=flat-square&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)

---

## ✨ Core Components

### 🧠 RAG Intelligence
- **Qdrant Integration**: Stores and retrieves profile embeddings for semantic search.
- **Gemini Pro**: Generates human-like insights and responses based on filtered friend data.
- **User Scoping**: Implements high-performance filtering at the vector layer to ensure data privacy.

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
   docker-compose up -d mysql redis qdrant
   ```

2. **Configuration**:
   Edit `config/local.yaml`:
   - Set `gemini_api_key`.
   - Backend will use `localhost` by default for infrastructure if running manually.

3. **Database Setup**:
   The backend will automatically try to create the database if it doesn't exist, but you can manually create it:
   ```sql
   CREATE DATABASE nexia_db;
   ```

4. **Run Server**:
   ```bash
   go run cmd/server/main.go
   ```

---

## 🔗 Links
- [Root Project README](../README.md)
- [Frontend Documentation](../frontend/README.md)
