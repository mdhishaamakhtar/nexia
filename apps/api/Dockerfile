FROM oven/bun:1

# Shared package (must be at /repo/packages/shared for file: dep)
COPY packages/shared/package.json /repo/packages/shared/package.json
COPY packages/shared/src /repo/packages/shared/src

# API app
WORKDIR /repo/apps/api
COPY apps/api/package.json .
COPY apps/api/src src
COPY apps/api/config config
COPY apps/api/drizzle drizzle
COPY apps/api/drizzle.config.ts .
COPY apps/api/tsconfig.json .

# Override workspace:* to file: dep for Docker
RUN sed -i 's/"workspace:\*"/"file:..\/..\/packages\/shared"/g' package.json

RUN bun install

EXPOSE 8080
CMD ["bun", "src/index.ts"]
