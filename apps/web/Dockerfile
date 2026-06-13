# Next.js web app. Build context is the repo root (monorepo workspace install).
FROM oven/bun:1 AS builder
WORKDIR /repo

ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

COPY packages/shared packages/shared
COPY tsconfig.base.json ./
COPY apps/web apps/web

WORKDIR /repo/apps/web
RUN bun run build

FROM oven/bun:1 AS runner
WORKDIR /repo

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

COPY packages/shared packages/shared
COPY --from=builder /repo/apps/web/.next apps/web/.next
COPY --from=builder /repo/apps/web/public apps/web/public
COPY --from=builder /repo/apps/web/next.config.ts apps/web/next.config.ts

WORKDIR /repo/apps/web
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["bun", "run", "start"]
