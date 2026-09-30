import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { emailVerificationTokens, passwordResetTokens, users } from "../../src/db/schema";
import { hashToken } from "../../src/services/auth-service";
import { createHarness, type Harness } from "../helpers/harness";
import {
  bearerAuth,
  call,
  errorCode,
  loginSession,
  seedUser,
  TEST_PASSWORD,
} from "../helpers/factories";
import {
  errorOnEmail,
  failNextEmail,
  lastEmail,
  sentEmails,
  tokenFromEmail,
} from "../helpers/email";

let h: Harness;

beforeAll(() => {
  h = createHarness();
});
afterAll(async () => {
  await h.close();
});

const signup = (body: unknown) => call(h.app, "POST", "/api/v1/auth/signup", { body });
const login = (body: unknown) => call(h.app, "POST", "/api/v1/auth/login", { body });
const verify = (token: string) =>
  call(h.app, "GET", `/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`);
const resend = (email: string) =>
  call(h.app, "POST", "/api/v1/auth/resend-verification", { body: { email } });
const forgot = (email: string) =>
  call(h.app, "POST", "/api/v1/auth/forgot-password", { body: { email } });
const reset = (token: string, new_password: string) =>
  call(h.app, "POST", "/api/v1/auth/reset-password", { body: { token, new_password } });

/** Pretends the last link email went out over a minute ago, past the cooldown. */
async function expireCooldown(): Promise<void> {
  const past = new Date(Date.now() - 5 * 60 * 1000);
  await h.db.update(emailVerificationTokens).set({ createdAt: past });
  await h.db.update(passwordResetTokens).set({ createdAt: past });
}

async function userRow(email: string) {
  const [row] = await h.db.select().from(users).where(eq(users.email, email));
  return row;
}

describe("POST /auth/signup", () => {
  test("creates an unverified account and emails a verification link", async () => {
    const res = await signup({ email: "new@example.com", password: TEST_PASSWORD });
    expect(res.status).toBe(201);

    const row = await userRow("new@example.com");
    expect(row!.emailVerified).toBe(false);
    expect(row!.password.startsWith("$2")).toBe(true);

    expect(sentEmails).toHaveLength(1);
    expect(lastEmail()!.to).toEqual(["new@example.com"]);
    expect(lastEmail()!.html).toContain("/verify-email/confirm?token=");
  });

  test("stores the address trimmed and lower-cased", async () => {
    await signup({ email: "  New.Person@Example.COM ", password: TEST_PASSWORD });
    expect(await userRow("new.person@example.com")).toBeDefined();
  });

  test("stores only a hash of the emailed token", async () => {
    await signup({ email: "hashed@example.com", password: TEST_PASSWORD });
    const token = tokenFromEmail(lastEmail());

    const [stored] = await h.db.select().from(emailVerificationTokens);
    expect(stored!.token).not.toBe(token);
    expect(stored!.token).toBe(hashToken(token));
  });

  test("answers an existing verified address exactly like a new one, and sends nothing", async () => {
    await seedUser(h, { email: "taken@example.com" });
    const res = await signup({ email: "taken@example.com", password: TEST_PASSWORD });
    const fresh = await signup({ email: "fresh@example.com", password: TEST_PASSWORD });

    expect(res.status).toBe(fresh.status);
    expect(res.body).toEqual(fresh.body);
    expect(sentEmails.map((e) => e.to[0])).toEqual(["fresh@example.com"]);
  });

  test("re-sends the link for an address that signed up but never verified", async () => {
    await signup({ email: "again@example.com", password: TEST_PASSWORD });
    const first = tokenFromEmail(lastEmail());
    await expireCooldown();

    const res = await signup({ email: "again@example.com", password: TEST_PASSWORD });
    expect(res.status).toBe(201);
    const second = tokenFromEmail(lastEmail());
    expect(second).not.toBe(first);

    // Only the newest link works.
    expect((await verify(first)).status).toBe(404);
    expect((await verify(second)).status).toBe(200);
  });

  test("two sign-ups racing for one address create one account and both succeed", async () => {
    const results = await Promise.all([
      signup({ email: "race-signup@example.com", password: TEST_PASSWORD }),
      signup({ email: "race-signup@example.com", password: TEST_PASSWORD }),
    ]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect(
      await h.db.select().from(users).where(eq(users.email, "race-signup@example.com"))
    ).toHaveLength(1);
  });

  test("with email disabled, sign-up still works and nothing is sent", async () => {
    const quiet = createHarness({ config: { email: { resend_api_key: "" } } });
    try {
      const res = await call(quiet.app, "POST", "/api/v1/auth/signup", {
        body: { email: "quiet@example.com", password: TEST_PASSWORD },
      });
      expect(res.status).toBe(201);
      expect(sentEmails).toHaveLength(0);
    } finally {
      await quiet.close();
    }
  });

  test.each([
    ["a malformed email", { email: "not-an-email", password: TEST_PASSWORD }],
    ["a seven-character password", { email: "short@example.com", password: "1234567" }],
    ["a missing password", { email: "nofield@example.com" }],
  ])("rejects %s", async (_label, body) => {
    const res = await signup(body);
    expect(res.status).toBe(400);
    expect(errorCode(res)).toBe("VALIDATION_ERROR");
  });

  test("still succeeds when the email provider rejects or cannot be reached", async () => {
    failNextEmail(422, "invalid recipient");
    expect((await signup({ email: "bounce@example.com", password: TEST_PASSWORD })).status).toBe(
      201
    );
    expect(await userRow("bounce@example.com")).toBeDefined();

    errorOnEmail();
    expect((await signup({ email: "offline@example.com", password: TEST_PASSWORD })).status).toBe(
      201
    );
  });
});

describe("POST /auth/resend-verification", () => {
  test("sends a fresh link to an unverified account", async () => {
    await signup({ email: "stuck@example.com", password: TEST_PASSWORD });
    await expireCooldown();

    const res = await resend("Stuck@Example.com");
    expect(res.status).toBe(200);
    expect(sentEmails).toHaveLength(2);
    expect((await verify(tokenFromEmail(lastEmail()))).status).toBe(200);
  });

  test("sends at most one link a minute", async () => {
    await signup({ email: "eager@example.com", password: TEST_PASSWORD });
    await resend("eager@example.com");
    await resend("eager@example.com");
    expect(sentEmails).toHaveLength(1);
  });

  test("answers the same for verified and unknown addresses, and sends nothing", async () => {
    await seedUser(h, { email: "done@example.com" });
    const known = await resend("done@example.com");
    const unknown = await resend("nobody@example.com");
    expect(known.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(sentEmails).toHaveLength(0);
  });
});

describe("GET /auth/verify-email", () => {
  async function signupAndGetToken(email: string): Promise<string> {
    await signup({ email, password: TEST_PASSWORD });
    return tokenFromEmail(lastEmail());
  }

  test("verifies the account", async () => {
    const token = await signupAndGetToken("verify@example.com");
    expect((await verify(token)).status).toBe(200);
    expect((await userRow("verify@example.com"))!.emailVerified).toBe(true);
  });

  test("opening the link again still succeeds once the account is verified", async () => {
    const token = await signupAndGetToken("twice@example.com");
    await verify(token);
    expect((await verify(token)).status).toBe(200);
  });

  test("rejects an expired link", async () => {
    const token = await signupAndGetToken("expired@example.com");
    await h.db
      .update(emailVerificationTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(emailVerificationTokens.token, hashToken(token)));

    expect((await verify(token)).status).toBe(404);
  });

  test("rejects an unknown or malformed token", async () => {
    expect((await verify("a".repeat(64))).status).toBe(404);
    expect((await verify("nope")).status).toBe(400);
    const missing = await call(h.app, "GET", "/api/v1/auth/verify-email");
    expect(missing.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  test("returns a token and sets Lax auth and CSRF cookies", async () => {
    const user = await seedUser(h, { email: "login@example.com" });

    const res = await login({ email: user.email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect((res.body as { token: string }).token).toBeTruthy();

    const cookies = res.headers.getSetCookie().join("\n");
    expect(cookies).toMatch(/nexia_token=[^\n]*HttpOnly/i);
    expect(cookies).not.toMatch(/nexia_csrf=[^\n]*HttpOnly/i);
    expect(cookies).toMatch(/nexia_token=[^\n]*SameSite=Lax/i);
  });

  test("accepts the address in any case", async () => {
    const user = await seedUser(h, { email: "mixed@example.com" });
    expect((await login({ email: "  MIXED@Example.com", password: TEST_PASSWORD })).status).toBe(
      200
    );
    expect(user).toBeDefined();
  });

  test("gives one answer for a wrong password and for no account at all", async () => {
    await seedUser(h, { email: "wrongpw@example.com" });
    const wrong = await login({ email: "wrongpw@example.com", password: "not-the-password" });
    const ghost = await login({ email: "ghost@example.com", password: TEST_PASSWORD });

    expect(wrong.status).toBe(401);
    expect(ghost.status).toBe(401);
    expect(wrong.body).toEqual(ghost.body);
  });

  test("refuses an unverified account with 403, only with the right password", async () => {
    const user = await seedUser(h, { email: "unverified@example.com", verified: false });
    const res = await login({ email: user.email, password: TEST_PASSWORD });
    expect(res.status).toBe(403);
    expect(errorCode(res)).toBe("EMAIL_NOT_VERIFIED");

    expect((await login({ email: user.email, password: "wrong-password" })).status).toBe(401);
  });

  test("still accepts a password shorter than today's minimum", async () => {
    const user = await seedUser(h, { email: "legacy@example.com", password: "sixsix" });
    expect((await login({ email: user.email, password: "sixsix" })).status).toBe(200);
  });
});

describe("password reset", () => {
  test("emails a link that carries the token, and the new password works", async () => {
    const user = await seedUser(h, { email: "reset@example.com" });

    expect((await forgot(user.email)).status).toBe(200);
    expect(lastEmail()!.html).toContain("/reset-password?token=");
    const token = tokenFromEmail(lastEmail());

    expect((await reset(token, "brand-new-password")).status).toBe(200);
    expect((await login({ email: user.email, password: "brand-new-password" })).status).toBe(200);
    expect((await login({ email: user.email, password: TEST_PASSWORD })).status).toBe(401);
  });

  test("ends every session issued before the reset", async () => {
    const user = await seedUser(h, { email: "revoke@example.com" });
    const auth = await bearerAuth(h, user.id);
    expect((await call(h.app, "GET", "/api/v1/auth/me", { headers: auth })).status).toBe(200);

    await forgot(user.email);
    // Tokens have one-second resolution; make sure the old one is strictly older.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await reset(tokenFromEmail(lastEmail()), "brand-new-password");

    expect((await call(h.app, "GET", "/api/v1/auth/me", { headers: auth })).status).toBe(401);
  });

  test("verifies the address, since the link proved the person reads it", async () => {
    const user = await seedUser(h, { email: "unverified-reset@example.com", verified: false });
    await forgot(user.email);
    await reset(tokenFromEmail(lastEmail()), "brand-new-password");

    expect((await login({ email: user.email, password: "brand-new-password" })).status).toBe(200);
  });

  test("a link works once, even when two requests race with it", async () => {
    const user = await seedUser(h, { email: "race@example.com" });
    await forgot(user.email);
    const token = tokenFromEmail(lastEmail());

    const results = await Promise.all([
      reset(token, "first-new-password"),
      reset(token, "second-new-password"),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 404]);
  });

  test("only the newest link works", async () => {
    const user = await seedUser(h, { email: "newest@example.com" });
    await forgot(user.email);
    const first = tokenFromEmail(lastEmail());
    await expireCooldown();
    await forgot(user.email);
    const second = tokenFromEmail(lastEmail());

    expect((await reset(first, "first-new-password")).status).toBe(404);
    expect((await reset(second, "second-new-password")).status).toBe(200);
  });

  test("rejects an expired link", async () => {
    const user = await seedUser(h, { email: "stale@example.com" });
    await forgot(user.email);
    const token = tokenFromEmail(lastEmail());
    await h.db.update(passwordResetTokens).set({ expiresAt: new Date(Date.now() - 1000) });

    expect((await reset(token, "too-late-password")).status).toBe(404);
  });

  test("sends at most one reset email a minute", async () => {
    const user = await seedUser(h, { email: "impatient@example.com" });
    await forgot(user.email);
    await forgot(user.email);
    expect(sentEmails).toHaveLength(1);
  });

  test("does not disclose whether an email exists", async () => {
    const res = await forgot("nobody@example.com");
    expect(res.status).toBe(200);
    expect(sentEmails).toHaveLength(0);
  });

  test("rejects a short new password and a malformed token", async () => {
    const user = await seedUser(h, { email: "shortnew@example.com" });
    await forgot(user.email);
    expect((await reset(tokenFromEmail(lastEmail()), "abc")).status).toBe(400);
    expect((await reset("does-not-exist", "whatever-password")).status).toBe(400);
  });

  test("succeeds even when the reset email cannot be delivered", async () => {
    const user = await seedUser(h, { email: "nomail@example.com" });
    failNextEmail();
    expect((await forgot(user.email)).status).toBe(200);
  });
});

describe("session routes", () => {
  test("GET /auth/me identifies the bearer or cookie user", async () => {
    const user = await seedUser(h, { email: "cookie@example.com" });
    const bearer = await call<{ user_id: number }>(h.app, "GET", "/api/v1/auth/me", {
      headers: await bearerAuth(h, user.id),
    });
    expect(bearer.body.user_id).toBe(user.id);

    const session = await loginSession(h, user.email, TEST_PASSWORD);
    const cookie = await call<{ user_id: number }>(h.app, "GET", "/api/v1/auth/me", {
      headers: { Cookie: session.cookie },
    });
    expect(cookie.body.user_id).toBe(user.id);
  });

  test("POST /auth/logout clears both cookies", async () => {
    const user = await seedUser(h, { email: "bye@example.com" });
    const session = await loginSession(h, user.email, TEST_PASSWORD);

    const res = await call(h.app, "POST", "/api/v1/auth/logout", {
      headers: { Cookie: session.cookie, "X-CSRF-Token": session.csrfToken },
    });
    expect(res.status).toBe(200);

    const cleared = res.headers.getSetCookie().join("\n");
    expect(cleared).toContain("nexia_token=;");
    expect(cleared).toContain("nexia_csrf=;");
  });

  test("rejects a token whose user no longer exists", async () => {
    const user = await seedUser(h, { email: "deleted@example.com" });
    const auth = await bearerAuth(h, user.id);
    await h.db.delete(users).where(eq(users.id, user.id));

    expect((await call(h.app, "GET", "/api/v1/auth/me", { headers: auth })).status).toBe(401);
  });
});
