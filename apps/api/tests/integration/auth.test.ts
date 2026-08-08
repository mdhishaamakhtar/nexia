import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { emailVerificationTokens, passwordResetTokens, users } from "../../src/db/schema";
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
  resetTokenFromEmail,
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

describe("POST /auth/signup", () => {
  test("creates an unverified account and sends a verification email", async () => {
    const res = await signup({ email: "new@example.com", password: TEST_PASSWORD });
    expect(res.status).toBe(201);

    const [row] = await h.db.select().from(users).where(eq(users.email, "new@example.com"));
    expect(row).toBeDefined();
    expect(row!.emailVerified).toBe(false);
    // Never stored in the clear.
    expect(row!.password).not.toBe(TEST_PASSWORD);
    expect(row!.password.startsWith("$2")).toBe(true);

    expect(sentEmails).toHaveLength(1);
    expect(lastEmail()!.to).toEqual(["new@example.com"]);
  });

  test("rejects a duplicate email with 409", async () => {
    await seedUser(h, { email: "taken@example.com" });
    const res = await signup({ email: "taken@example.com", password: TEST_PASSWORD });
    expect(res.status).toBe(409);
    expect(errorCode(res)).toBe("EMAIL_CONFLICT");
  });

  test("rejects a malformed email", async () => {
    const res = await signup({ email: "not-an-email", password: TEST_PASSWORD });
    expect(res.status).toBe(400);
    expect(errorCode(res)).toBe("VALIDATION_ERROR");
  });

  test("rejects a short password", async () => {
    const res = await signup({ email: "short@example.com", password: "abc" });
    expect(res.status).toBe(400);
    expect(errorCode(res)).toBe("VALIDATION_ERROR");
  });

  test("rejects a missing password field", async () => {
    const res = await signup({ email: "nofield@example.com" });
    expect(res.status).toBe(400);
  });

  test("rejects a non-JSON body", async () => {
    const res = await h.app.request("/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
  });

  test("still succeeds when the email provider rejects the send", async () => {
    failNextEmail(422, "invalid recipient");
    const res = await signup({ email: "bounce@example.com", password: TEST_PASSWORD });

    // The account must exist even though notification failed — the user can
    // request another verification email, but losing the signup is unrecoverable.
    expect(res.status).toBe(201);
    const [row] = await h.db.select().from(users).where(eq(users.email, "bounce@example.com"));
    expect(row).toBeDefined();
  });

  test("still succeeds when the email provider is unreachable", async () => {
    errorOnEmail();
    const res = await signup({ email: "offline@example.com", password: TEST_PASSWORD });
    expect(res.status).toBe(201);
  });
});

describe("GET /auth/verify-email", () => {
  async function signupAndGetToken(email: string): Promise<string> {
    await signup({ email, password: TEST_PASSWORD });
    return tokenFromEmail(lastEmail());
  }

  test("verifies the account and consumes the token", async () => {
    const token = await signupAndGetToken("verify@example.com");

    const res = await call(h.app, "GET", `/api/v1/auth/verify-email?token=${token}`);
    expect(res.status).toBe(200);

    const [row] = await h.db.select().from(users).where(eq(users.email, "verify@example.com"));
    expect(row!.emailVerified).toBe(true);

    const [stored] = await h.db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
    expect(stored!.used).toBe(true);
  });

  test("rejects a second use of the same token", async () => {
    const token = await signupAndGetToken("once@example.com");
    await call(h.app, "GET", `/api/v1/auth/verify-email?token=${token}`);

    const res = await call(h.app, "GET", `/api/v1/auth/verify-email?token=${token}`);
    expect(res.status).toBe(404);
  });

  test("rejects an expired token", async () => {
    const token = await signupAndGetToken("expired@example.com");
    await h.db
      .update(emailVerificationTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(emailVerificationTokens.token, token));

    const res = await call(h.app, "GET", `/api/v1/auth/verify-email?token=${token}`);
    expect(res.status).toBe(404);
  });

  test("rejects an unknown token", async () => {
    const res = await call(h.app, "GET", "/api/v1/auth/verify-email?token=nope");
    expect(res.status).toBe(404);
  });

  test("requires the token query parameter", async () => {
    const res = await call(h.app, "GET", "/api/v1/auth/verify-email");
    expect(res.status).toBe(400);
    expect(errorCode(res)).toBe("VALIDATION_ERROR");
  });
});

describe("POST /auth/login", () => {
  test("returns a token and sets auth + CSRF cookies", async () => {
    const user = await seedUser(h, { email: "login@example.com" });

    const res = await login({ email: user.email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect((res.body as { token: string }).token).toBeTruthy();

    const cookies = res.headers.getSetCookie().join("\n");
    expect(cookies).toContain("nexia_token=");
    expect(cookies).toContain("nexia_csrf=");
    // The session cookie must not be readable by scripts; the CSRF one must be.
    expect(cookies).toMatch(/nexia_token=[^\n]*HttpOnly/i);
    expect(cookies).not.toMatch(/nexia_csrf=[^\n]*HttpOnly/i);
  });

  test("refuses an unverified account with 403", async () => {
    const user = await seedUser(h, { email: "unverified@example.com", verified: false });
    const res = await login({ email: user.email, password: TEST_PASSWORD });
    expect(res.status).toBe(403);
    expect(errorCode(res)).toBe("EMAIL_NOT_VERIFIED");
  });

  test("refuses a wrong password with 401", async () => {
    const user = await seedUser(h, { email: "wrongpw@example.com" });
    const res = await login({ email: user.email, password: "not-the-password" });
    expect(res.status).toBe(401);
    expect(errorCode(res)).toBe("UNAUTHORIZED");
  });

  test("reports an unknown account with 401", async () => {
    const res = await login({ email: "ghost@example.com", password: TEST_PASSWORD });
    expect(res.status).toBe(401);
    expect(errorCode(res)).toBe("ACCOUNT_NOT_FOUND");
  });
});

describe("password reset", () => {
  test("resets the password and lets the new one log in", async () => {
    const user = await seedUser(h, { email: "reset@example.com" });

    const forgot = await call(h.app, "POST", "/api/v1/auth/forgot-password", {
      body: { email: user.email },
    });
    expect(forgot.status).toBe(200);
    const token = resetTokenFromEmail(lastEmail());

    const reset = await call(h.app, "POST", "/api/v1/auth/reset-password", {
      body: { token, new_password: "brand-new-password" },
    });
    expect(reset.status).toBe(200);

    const withNew = await login({ email: user.email, password: "brand-new-password" });
    expect(withNew.status).toBe(200);

    const withOld = await login({ email: user.email, password: TEST_PASSWORD });
    expect(withOld.status).toBe(401);
  });

  test("does not disclose whether an email exists", async () => {
    const res = await call(h.app, "POST", "/api/v1/auth/forgot-password", {
      body: { email: "nobody@example.com" },
    });
    expect(res.status).toBe(200);
    expect(sentEmails).toHaveLength(0);
  });

  test("rejects a reused reset token", async () => {
    const user = await seedUser(h, { email: "reuse@example.com" });
    await call(h.app, "POST", "/api/v1/auth/forgot-password", { body: { email: user.email } });
    const token = resetTokenFromEmail(lastEmail());

    await call(h.app, "POST", "/api/v1/auth/reset-password", {
      body: { token, new_password: "first-new-password" },
    });
    const second = await call(h.app, "POST", "/api/v1/auth/reset-password", {
      body: { token, new_password: "second-new-password" },
    });
    expect(second.status).toBe(404);
  });

  test("rejects an expired reset token", async () => {
    const user = await seedUser(h, { email: "stale@example.com" });
    await call(h.app, "POST", "/api/v1/auth/forgot-password", { body: { email: user.email } });
    const token = resetTokenFromEmail(lastEmail());

    await h.db
      .update(passwordResetTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(passwordResetTokens.token, token));

    const res = await call(h.app, "POST", "/api/v1/auth/reset-password", {
      body: { token, new_password: "too-late-password" },
    });
    expect(res.status).toBe(404);
  });

  test("rejects an unknown reset token", async () => {
    const res = await call(h.app, "POST", "/api/v1/auth/reset-password", {
      body: { token: "does-not-exist", new_password: "whatever-password" },
    });
    expect(res.status).toBe(404);
  });

  test("rejects a short new password", async () => {
    const user = await seedUser(h, { email: "shortnew@example.com" });
    await call(h.app, "POST", "/api/v1/auth/forgot-password", { body: { email: user.email } });
    const token = resetTokenFromEmail(lastEmail());

    const res = await call(h.app, "POST", "/api/v1/auth/reset-password", {
      body: { token, new_password: "abc" },
    });
    expect(res.status).toBe(400);
  });

  test("succeeds even when the reset email cannot be delivered", async () => {
    const user = await seedUser(h, { email: "nomail@example.com" });
    failNextEmail();
    const res = await call(h.app, "POST", "/api/v1/auth/forgot-password", {
      body: { email: user.email },
    });
    expect(res.status).toBe(200);
  });
});

describe("session routes", () => {
  test("GET /auth/me identifies the bearer-authenticated user", async () => {
    const user = await seedUser(h);
    const res = await call<{ authenticated: boolean; user_id: number }>(
      h.app,
      "GET",
      "/api/v1/auth/me",
      { headers: await bearerAuth(h, user.id) }
    );
    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(user.id);
  });

  test("GET /auth/me works with the cookie session too", async () => {
    const user = await seedUser(h, { email: "cookie@example.com" });
    const session = await loginSession(h, user.email, TEST_PASSWORD);

    const res = await call<{ user_id: number }>(h.app, "GET", "/api/v1/auth/me", {
      headers: { Cookie: session.cookie },
    });
    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(user.id);
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

    const res = await call(h.app, "GET", "/api/v1/auth/me", { headers: auth });
    expect(res.status).toBe(401);
  });
});
