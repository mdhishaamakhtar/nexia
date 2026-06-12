FROM oven/bun:1 AS deps
WORKDIR /repo
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile --filter api --filter @nexia/shared

FROM oven/bun:1
WORKDIR /repo
COPY --from=deps /repo/node_modules node_modules
COPY packages/shared packages/shared
COPY apps/api apps/api
WORKDIR /repo/apps/api
EXPOSE 8080
CMD ["bun", "src/index.ts"]
