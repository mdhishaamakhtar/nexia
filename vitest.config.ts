import { defineConfig } from "vitest/config";

/**
 * Three projects so unit feedback stays fast: `shared` and `api-unit` are pure
 * and run in parallel, while `api-integration` is the only one that pays for
 * Docker containers. Coverage is configured once, at the root, so thresholds
 * apply to the union of every project's run.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "shared",
          root: "./packages/shared",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "api-unit",
          root: "./apps/api",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "api-integration",
          root: "./apps/api",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["./tests/setup/global.ts"],
          setupFiles: ["./tests/setup/each.ts"],
          // Every file shares one Postgres and one Redis, and isolation comes
          // from truncating between tests — which only holds if no two files
          // are in flight at once.
          fileParallelism: false,
          testTimeout: 30_000,
          // Generous: the first run pays for image pulls.
          hookTimeout: 300_000,
        },
      },
    ],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov"],
      include: ["apps/api/src/**", "packages/shared/src/**"],
      exclude: [
        "**/*.test.ts",
        // Process bootstrap: binds a port and installs signal handlers, so it
        // cannot be exercised in-process. Its logic is one call to createApp().
        "apps/api/src/index.ts",
        // One-shot operational script, not part of the served application.
        "apps/api/src/scripts/**",
        // Declarative Drizzle table/relation definitions — no behaviour.
        "apps/api/src/db/schema.ts",
      ],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
  },
});
