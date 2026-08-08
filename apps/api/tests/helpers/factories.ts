import type { Hono } from "hono";
import type { ProfileInput } from "@nexia/shared";
import { users } from "../../src/db/schema";
import { generateToken } from "../../src/utils/jwt";
import { createBcryptHasher } from "../../src/services/password-hasher";
import type { Harness } from "./harness";

export const TEST_PASSWORD = "password123";

const hasher = createBcryptHasher(4);
let emailCounter = 0;

export interface SeededUser {
  id: number;
  email: string;
  password: string;
}

/**
 * Inserts a verified user straight into the database. The signup/verify flow has
 * its own dedicated tests; every other suite just needs an account to exist, and
 * going through HTTP for that would make each test pay for bcrypt and two
 * round-trips it is not trying to assert anything about.
 */
export async function seedUser(
  h: Harness,
  opts: { email?: string; password?: string; verified?: boolean } = {}
): Promise<SeededUser> {
  const email = opts.email ?? `user${++emailCounter}@example.com`;
  const password = opts.password ?? TEST_PASSWORD;

  const [row] = await h.db
    .insert(users)
    .values({
      email,
      password: await hasher.hash(password),
      emailVerified: opts.verified ?? true,
    })
    .returning({ id: users.id });

  if (!row) throw new Error("failed to seed user");
  return { id: row.id, email, password };
}

export async function bearerAuth(h: Harness, userId: number): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${await generateToken(userId, h.config)}` };
}

export interface Session {
  cookie: string;
  csrfToken: string;
}

/** Logs in over HTTP and returns the cookie pair, for cookie/CSRF-path tests. */
export async function loginSession(h: Harness, email: string, password: string): Promise<Session> {
  const res = await h.app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) {
    throw new Error(`login failed with ${res.status}: ${await res.text()}`);
  }

  const jar = new Map<string, string>();
  for (const raw of res.headers.getSetCookie()) {
    const [pair] = raw.split(";");
    const idx = pair?.indexOf("=") ?? -1;
    if (pair && idx > 0) jar.set(pair.slice(0, idx), pair.slice(idx + 1));
  }

  const csrfToken = jar.get("nexia_csrf");
  if (!csrfToken) throw new Error("login did not set a CSRF cookie");

  return {
    cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
    csrfToken,
  };
}

export function profileInput(overrides: Partial<ProfileInput> = {}): ProfileInput {
  return {
    full_name: "Alice Example",
    relationship_type: "Friend",
    ...overrides,
  } as ProfileInput;
}

interface RequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
}

export interface TestResponse<T> {
  status: number;
  body: T;
  headers: Headers;
}

/** Reads the `{ error: { code } }` envelope every failure path returns. */
export function errorCode(res: TestResponse<unknown>): string | undefined {
  return (res.body as { error?: { code?: string } } | null)?.error?.code;
}

/** Thin wrapper over app.request() that handles JSON encoding and parsing. */
export async function call<T = unknown>(
  app: Hono,
  method: string,
  path: string,
  { headers = {}, body }: RequestOptions = {}
): Promise<TestResponse<T>> {
  const res = await app.request(path, {
    method,
    headers: body === undefined ? headers : { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response (streamed chat, plain text errors) — hand back the text.
  }

  return { status: res.status, body: parsed as T, headers: res.headers };
}
