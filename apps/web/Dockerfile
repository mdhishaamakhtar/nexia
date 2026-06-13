FROM oven/bun:1 AS builder
WORKDIR /repo

ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/eslint-config/*.mjs packages/eslint-config/
COPY packages/prettier-config/package.json packages/prettier-config/
COPY packages/prettier-config/*.js packages/prettier-config/
RUN bun install

COPY packages/shared packages/shared
COPY packages/eslint-config packages/eslint-config
COPY packages/prettier-config packages/prettier-config
COPY apps/web apps/web

WORKDIR /repo/apps/web
RUN bun run build

FROM oven/bun:1 AS runner
WORKDIR /repo

COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/eslint-config/*.mjs packages/eslint-config/
COPY packages/prettier-config/package.json packages/prettier-config/
COPY packages/prettier-config/*.js packages/prettier-config/
RUN bun install

COPY --from=builder /repo/apps/web/.next apps/web/.next
COPY --from=builder /repo/apps/web/public apps/web/public
COPY --from=builder /repo/apps/web/package.json apps/web/package.json
COPY --from=builder /repo/apps/web/next.config.ts apps/web/next.config.ts

WORKDIR /repo/apps/web
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["bun", "run", "start"]
