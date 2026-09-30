import { afterAll, beforeAll, beforeEach } from "vitest";
import { mswServer, resetEmails } from "../helpers/email";
import { closeTestDb, truncateAll } from "../helpers/db";

/*
 * `onUnhandledRequest: "error"` is deliberate: any outbound HTTP the suite did
 * not explicitly stub fails the test rather than silently reaching the network.
 * Postgres speaks TCP, not fetch, so it is unaffected.
 */
beforeAll(() => {
  mswServer.listen({ onUnhandledRequest: "error" });
});

beforeEach(async () => {
  await truncateAll();
  resetEmails();
});

afterAll(async () => {
  mswServer.close();
  await closeTestDb();
});
