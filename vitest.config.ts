import { defineConfig } from "vitest/config";

/**
 * Four projects so unit feedback stays fast: `shared`, `api-unit` and `web`
 * need nothing running, while `api-integration` is the only one that pays for
 * Docker containers. Coverage is configured once, at the root, so thresholds
 * apply to the union of every project's run. (`web` keeps its jsdom and React
 * settings in `apps/web/vitest.config.ts`.)
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
          // Every file shares one Postgres, and isolation comes
          // from truncating between tests — which only holds if no two files
          // are in flight at once.
          fileParallelism: false,
          testTimeout: 30_000,
          // Generous: the first run pays for image pulls.
          hookTimeout: 300_000,
        },
      },
      "./apps/web/vitest.config.ts",
    ],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov"],
      include: [
        "apps/api/src/**/*.ts",
        "packages/shared/src/**/*.ts",
        "apps/web/src/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        // Process bootstrap: binds a port and installs signal handlers, so it
        // cannot be exercised in-process. Its logic is one call to createApp().
        "apps/api/src/index.ts",
        // Declarative Drizzle table/relation definitions — no behaviour.
        "apps/api/src/db/schema.ts",
        // Next.js routes are exercised by the Playwright journeys (apps/web/e2e),
        // which render them for real; unit tests cover what they are built from.
        "apps/web/src/app/**",
        // Vendored ai-elements primitives, not ours (also outside lint).
        "apps/web/src/components/ai-elements/**",
        // Renderers that need a real canvas or the Next image runtime. The E2E
        // suite downloads the PDF and fetches the social image instead.
        "apps/web/src/features/profiles/exportProfilePdf.ts",
        "apps/web/src/shared/lib/social-image.tsx",
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
