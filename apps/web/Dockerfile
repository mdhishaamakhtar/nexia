# Next.js web app. Build context is the repo root (monorepo workspace install).
FROM node:24-alpine AS builder
WORKDIR /repo

ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace web --include-workspace-root

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN npm run build --workspace web

FROM node:24-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --omit=dev --workspace web --include-workspace-root \
  && npm cache clean --force

COPY packages/shared packages/shared
COPY --from=builder /repo/apps/web/.next apps/web/.next
COPY --from=builder /repo/apps/web/public apps/web/public
COPY --from=builder /repo/apps/web/next.config.ts apps/web/next.config.ts

WORKDIR /repo/apps/web
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["npm", "run", "start"]
