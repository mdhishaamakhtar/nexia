import { defineConfig, devices } from "@playwright/test";
import { API_URL, APP_URL, STORAGE_STATE } from "./e2e/support/env";

/**
 * Browser journeys against the real stack: the API bundle on its own port and
 * database (`apps/api/config/e2e.yaml`), and a production build of the web app
 * pointed at it. Postgres must be running (`docker compose up -d postgres`).
 *
 * Locally, `PLAYWRIGHT_CHANNEL=chrome` drives the installed Chrome instead of
 * a downloaded Chromium (`npx playwright install chromium`).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: APP_URL,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
  projects: [
    // Creates and signs in the shared account, once.
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "signed-out",
      testMatch: /signed-out\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "signed-in",
      testIgnore: /signed-out\.spec\.ts|auth\.setup\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
    },
  ],
  webServer: [
    {
      command: "node ../web/e2e/support/reset-db.ts && npm run build && node dist/index.js",
      cwd: "../api",
      url: `${API_URL}/api/v1/readyz`,
      env: { APP_ENV: "e2e", LOG_LEVEL: "warn" },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "next build && next start --port 3100",
      url: APP_URL,
      env: { NEXT_PUBLIC_BACKEND_URL: API_URL, NEXT_PUBLIC_APP_URL: APP_URL },
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
});
