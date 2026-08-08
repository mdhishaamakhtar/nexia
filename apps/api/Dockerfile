# Node + Hono API. Build context is the repo root (monorepo workspace install).
FROM node:24-alpine AS builder
WORKDIR /repo

# Install from the root lockfile. Every workspace manifest is copied so `npm ci`
# can reproduce the tree exactly; sources land afterwards to keep layers cached.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace api --include-workspace-root

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace api

FROM node:24-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --omit=dev --workspace api --include-workspace-root \
  && npm cache clean --force

# The bundle plus the two things it reads from disk at runtime: the YAML config
# (resolved against the workdir) and the SQL migrations (found by walking up
# from the bundle, see resolveMigrationsFolder).
COPY --from=builder /repo/apps/api/dist apps/api/dist
COPY apps/api/config apps/api/config
COPY apps/api/drizzle apps/api/drizzle

WORKDIR /repo/apps/api
EXPOSE 8080
CMD ["node", "dist/index.js"]
