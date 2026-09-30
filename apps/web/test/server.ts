import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

/** Where the app's ky client sends requests in tests (its default). */
export const API = "http://localhost:8080/api/v1";

/**
 * A mock backend for one test file. Any request without a handler fails the
 * test, so a component can't quietly talk to something unexpected.
 */
export function mockApi() {
  const server = setupServer();
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  return server;
}
