/** Where the suite's servers listen; must match `apps/api/config/e2e.yaml`. */
export const APP_URL = "http://localhost:3100";
export const API_URL = "http://localhost:8181";

/** The suite's own database, dropped and recreated on every run. */
export const E2E_DATABASE = "nexia_e2e";
export const POSTGRES_URL =
  process.env.E2E_POSTGRES_URL ?? "postgres://postgres:password@localhost:5432";

/** The signed-in browser state the `setup` project saves for the others. */
export const STORAGE_STATE = "e2e/.auth/user.json";

/** The account the `setup` project creates. */
export const USER = { email: "e2e@nexia.test", password: "e2e-password-1234" };
