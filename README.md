<!-- markdownlint-disable MD033 -->

<p align="center">
  <img src="frontend/public/assets/nexia-banner.png" alt="Nexia Banner" width="400" height="200">
</p>

## Nexia

Nexia is a digital slambook for your people.

You add profiles for friends/family, store the details you usually forget later (favorite songs, random quotes, food quirks, old memories), and ask an AI chat assistant questions about them.

Think: "Who hates mushrooms?" or "What song reminds me of Sam?" and get answers from your own saved context.

## What It Does

- Create and manage rich friend profiles
- Search profiles by name and relationship
- Chat with AI using RAG over your profile data
- Auto-derive zodiac from birthday
- Background embedding sync via Redis workers

## Tech Stack

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Go](https://img.shields.io/badge/Go-1.25-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev/)
[![Gin](https://img.shields.io/badge/Gin-1.11-009688?style=for-the-badge&logo=gin&logoColor=white)](https://gin-gonic.com/)
[![GORM](https://img.shields.io/badge/GORM-1.31-1A237E?style=for-the-badge&logo=go&logoColor=white)](https://gorm.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![pgvector](https://img.shields.io/badge/pgvector-PG17_Extension-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Asynq](https://img.shields.io/badge/Asynq-0.25.1-CE412B?style=for-the-badge&logo=go&logoColor=white)](https://github.com/hibiken/asynq)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

## Quick Start (Docker)

```bash
export GEMINI_API_KEY=your_key_here
docker-compose up --build
```

Then open:

- App: [http://localhost:3000](http://localhost:3000)
- Swagger: [http://localhost:3000/api/v1/swagger/index.html](http://localhost:3000/api/v1/swagger/index.html)

## Manual Dev Setup

### 1. Start infra

```bash
docker-compose up -d postgres redis
```

### 2. Run backend

```bash
cd backend
go run cmd/server/main.go
```

### 3. Run frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Optional: backfill embeddings

```bash
cd backend
go run cmd/sync/main.go
```

## Project Docs

- Backend: [backend/README.md](./backend/README.md)
- Frontend: [frontend/README.md](./frontend/README.md)

## Contributor

- Md Hishaam Akhtar

<p align="center">
  Built for remembering people better.
</p>
