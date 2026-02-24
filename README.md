<p align="center">
  <img src="frontend/public/assets/nexia_banner.png" alt="Nexia Banner" width="400" height="200">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.25%2B-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/PostgreSQL-17-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Gemini_AI-2.5_Flash-8E75C2?style=for-the-badge&logo=google-gemini&logoColor=white" alt="Gemini">
  <img src="https://img.shields.io/badge/pgvector-Vector_Search-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="pgvector">
  <img src="https://img.shields.io/badge/Redis-Queue-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/Asynq-Workers-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Asynq">
</p>

## 🌟 Overview

Nexia is a sophisticated personal digital slambook designed to modernize the way we cherish memories and friendships. Beyond standard storage, Nexia implements a **Retrieval-Augmented Generation (RAG)** pipeline, allowing you to have intelligent, context-aware conversations about your social circle.

Built with a high-performance **Go** backend and a cinematic **Next.js** frontend, Nexia offers a "Digital Sanctuary" for the people who matter most.

## ✨ Key Features

- **AI Intel Chat**: Interactive chatbot powered by Google Gemini 2.5 Flash and PostgreSQL semantic search.
- **Semantic Retrieval**: Uses vector embeddings stored directly in PostgreSQL (`pgvector`) to find relevant friend data instantly.
- **Async Processing**: Background embedding generation via Redis-backed workers.
- **Smart Derivations**: Automatic zodiac sign calculation and data normalization.

## 🚀 Quick Start (Recommended)

The easiest way to run Nexia is using **Docker Compose**. This starts the frontend, backend, database, and vector engine with a single command.

1. **Set your Gemini API Key**:

   ```bash
   export GEMINI_API_KEY=your_key_here
   ```

2. **Launch everything**:

   ```bash
   docker-compose up --build
   ```

3. **Access Nexia**:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **API Docs**: [http://localhost:3000/api/v1/swagger/index.html](http://localhost:3000/api/v1/swagger/index.html) (Proxied)

---

## 🛠 Manual Development Setup

If you prefer to run services manually for development:

### Prerequisites

- **Go 1.25+** | **Node.js 20+** | **Docker Desktop** (for DBs)

### 1. Launch DB Infrastructure

```bash
docker-compose up -d postgres redis
```

### 2. Backend Setup

```bash
cd backend
# Update config/local.yaml with your credentials
go run cmd/server/main.go
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Backfill Data

If you have existing profiles, index them into the AI engine:

```bash
cd backend
go run cmd/sync/main.go
```

## 📖 Deep Dives

- [**Backend Documentation**](./backend/README.md)
- [**Frontend Documentation**](./frontend/README.md)

## Contributors

- **Md Hishaam Akhtar**

<p align="center">
  Made with ❤️ for Friends
</p>
