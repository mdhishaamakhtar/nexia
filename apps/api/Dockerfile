FROM oven/bun:1

# Shared packages (must be at /repo/packages/ for file: dep resolution)
COPY packages/shared/package.json /repo/packages/shared/package.json
COPY packages/shared/src /repo/packages/shared/src
COPY packages/eslint-config/package.json /repo/packages/eslint-config/package.json
COPY packages/eslint-config/*.mjs /repo/packages/eslint-config/
COPY packages/prettier-config/package.json /repo/packages/prettier-config/package.json
COPY packages/prettier-config/*.js /repo/packages/prettier-config/

# API app
WORKDIR /repo/apps/api
COPY apps/api/package.json .
COPY apps/api/src src
COPY apps/api/config config
COPY apps/api/drizzle drizzle
COPY apps/api/drizzle.config.ts .
COPY apps/api/tsconfig.json .
COPY apps/api/eslint.config.mjs .
COPY apps/api/prettier.config.js .

# Override workspace:* to file: dep for Docker
RUN sed -i 's/"workspace:\*"/"file:..\/..\/packages\/shared"/g' package.json

RUN bun install

EXPOSE 8080
CMD ["bun", "src/index.ts"]
