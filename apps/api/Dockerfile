# Bun + Hono API. Build context is the repo root (monorepo workspace install).
FROM oven/bun:1
WORKDIR /repo

# Install deps from the root lockfile. All workspace manifests are copied so the
# frozen install matches the lockfile; sources are added afterwards for caching.
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api

WORKDIR /repo/apps/api
EXPOSE 8080
CMD ["bun", "src/index.ts"]
