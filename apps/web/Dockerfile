# Build stage
FROM oven/bun:1 AS builder
WORKDIR /repo

ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

# Install workspace dependencies
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

# Copy workspace source
COPY packages/shared packages/shared
COPY apps/web apps/web

# Build
WORKDIR /repo/apps/web
RUN bun run build

# Runner stage
FROM node:23-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /repo/apps/web/public ./public
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
