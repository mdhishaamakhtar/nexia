FROM oven/bun:1

WORKDIR /repo/apps/api

# Copy shared package — treat it as a local directory dep
COPY packages/shared/package.json /repo/packages/shared/package.json
COPY packages/shared/src /repo/packages/shared/src

# Copy api
COPY apps/api/package.json apps/api/./
COPY apps/api/src apps/api/src
COPY apps/api/config apps/api/config
COPY apps/api/drizzle apps/api/drizzle
COPY apps/api/drizzle.config.ts apps/api/drizzle.config.ts
COPY apps/api/tsconfig.json apps/api/tsconfig.json

# Override workspace:* to use a local path for Docker
RUN sed -i 's/"workspace:\*"/"file:..\/packages\/shared"/g' apps/api/package.json

# Install from api directory
WORKDIR /repo/apps/api
RUN bun install

EXPOSE 8080
CMD ["bun", "src/index.ts"]
