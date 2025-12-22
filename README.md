<p align="center">
  <img src="frontend/public/assets/nexia_banner.png" alt="Nexia Banner" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.25%2B-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go">
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Gemini_AI-Pro-8E75C2?style=for-the-badge&logo=google-gemini&logoColor=white" alt="Gemini">
  <img src="https://img.shields.io/badge/Qdrant-Vector_DB-black?style=for-the-badge&logo=qdrant&logoColor=white" alt="Qdrant">
  <img src="https://img.shields.io/badge/Redis-Queue-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/Asynq-Workers-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Asynq">
</p>


## 🌟 Overview

Nexia is a sophisticated personal digital slambook designed to modernize the way we cherish memories and friendships. Beyond standard storage, Nexia implements a **Retrieval-Augmented Generation (RAG)** pipeline, allowing you to have intelligent, context-aware conversations about your social circle.

Built with a high-performance **Go** backend and a cinematic **Next.js** frontend, Nexia offers a "Digital Sanctuary" for the people who matter most.


## ✨ Key Features

- **AI Intel Chat**: Interactive chatbot powered by Google Gemini and Qdrant.
- **Semantic Retrieval**: Uses vector embeddings to find relevant friend data instantly.
- **Async Processing**: Background embedding generation via Redis-backed workers.
- **Smart Derivations**: Automatic zodiac sign calculation and data normalization.


## 🚀 Quick Start

### Prerequisites
- **Go 1.25+** | **Node.js 18+** | **Docker Desktop** | **MySQL 8.0**

### 1. Launch Infrastructure
Start the Vector DB (Qdrant) and Task Queue (Redis):
```bash
docker-compose up -d
```

### 2. Backend Setup
```bash
cd backend
# 1. Update config/local.yaml with MySQL & Gemini API Key
# 2. Run the server
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
