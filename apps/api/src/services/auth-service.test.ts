import { describe, test, expect } from "bun:test";
import { AuthService, type UserRepo, type PasswordResetRepo, type EmailVerificationRepo, type EmailSender } from "../services/auth-service";
import { ServiceError, ErrorKind } from "../services/errors";
import pino from "pino";

const logger = pino({ level: "silent" });

const config = {
  server: {
    mode: "test" as const,
    jwt_secret: "test-secret",
    jwt_expiry_minutes: 60,
    port: 8080,
    cors_origins: [],
    cookie_domain: "",
    auth_rate_limit_requests: 10,
    auth_rate_limit_window_seconds: 10,
    auth_rate_limit_burst: 10,
    chat_rate_limit_requests: 10,
    chat_rate_limit_window_seconds: 60,
    chat_rate_limit_burst: 3,
  },
  db: { host: "", port: 5432, user: "", password: "", name: "", ssl_mode: "disable" as const, run_migrations: false, max_idle_conns: 10, max_open_conns: 50, conn_max_lifetime_minutes: 60 },
  ai: { gemini_api_key: "", redis_url: "", opencode_api_key: "", opencode_base_url: "", chat_model: "" },
  email: { resend_api_key: "", from_address: "", app_base_url: "" },
};

type StoredUser = { id: number; email: string; password: string; emailVerified: boolean };

class FakeUserRepo implements UserRepo {
  users: StoredUser[] = [];
  findErr: Error | null = null;
  updatePasswordErr: Error | null = null;
  updatedPassword = "";

  async create(user: { email: string; password: string; emailVerified: boolean }) {
    const u: StoredUser = { id: 42, ...user };
    this.users.push(u);
    return u;
  }
  async findByEmail(email: string) {
    if (this.findErr) throw this.findErr;
    return this.users.find((u) => u.email === email) ?? null;
  }
  async findById(id: number) {
    return this.users.find((u) => u.id === id) ?? null;
  }
  async updatePassword(userId: number, hashed: string) {
    if (this.updatePasswordErr) throw this.updatePasswordErr;
    this.updatedPassword = hashed;
    const u = this.users.find((u) => u.id === userId);
    if (u) u.password = hashed;
  }
  async updateEmailVerified(userId: number) {
    const u = this.users.find((u) => u.id === userId);
    if (u) u.emailVerified = true;
  }
}

class FakeResetRepo implements PasswordResetRepo {
  stored: Array<{ id: number; userId: number; token: string; expiresAt: Date; used: boolean }> = [];
  createErr: Error | null = null;

  async create(t: { userId: number; token: string; expiresAt: Date }) {
    if (this.createErr) throw this.createErr;
    const record = { id: 1, ...t, used: false };
    this.stored.push(record);
    return record;
  }
  async findByToken(token: string) {
    return this.stored.find((t) => t.token === token) ?? null;
  }
  async markAsUsed(id: number) {
    const t = this.stored.find((t) => t.id === id);
    if (t) t.used = true;
  }
}

class FakeVerifyRepo implements EmailVerificationRepo {
  stored: Array<{ id: number; userId: number; token: string; expiresAt: Date; used: boolean }> = [];
  createErr: Error | null = null;
  findErr: Error | null = null;

  async create(t: { userId: number; token: string; expiresAt: Date }) {
    if (this.createErr) throw this.createErr;
    const record = { id: 1, ...t, used: false };
    this.stored.push(record);
    return record;
  }
  async findByToken(token: string) {
    if (this.findErr) throw this.findErr;
    return this.stored.find((t) => t.token === token) ?? null;
  }
  async markAsUsed(id: number) {
    const t = this.stored.find((t) => t.id === id);
    if (t) t.used = true;
  }
}

class FakeEmailSender implements EmailSender {
  sentVerification: string[] = [];
  sentReset: string[] = [];
  sendErr: Error | null = null;

  async sendVerificationEmail(to: string, _token: string) {
    if (this.sendErr) throw this.sendErr;
    this.sentVerification.push(to);
  }
  async sendPasswordResetEmail(to: string, _token: string) {
    if (this.sendErr) throw this.sendErr;
    this.sentReset.push(to);
  }
}

function newSvc(
  userRepo = new FakeUserRepo(),
  resetRepo = new FakeResetRepo(),
  verifyRepo = new FakeVerifyRepo(),
  emailSvc = new FakeEmailSender(),
) {
  return new AuthService(userRepo, resetRepo, verifyRepo, emailSvc, config, logger);
}

function assertServiceError(err: unknown, kind: ErrorKind) {
  if (!(err instanceof ServiceError)) throw new Error(`Expected ServiceError, got ${String(err)}`);
  expect(err.kind).toBe(kind);
}

describe("AuthService", () => {
  test("signup success", async () => {
    const emailSvc = new FakeEmailSender();
    const svc = newSvc(new FakeUserRepo(), new FakeResetRepo(), new FakeVerifyRepo(), emailSvc);
    await svc.signup("alice@example.com", "password123");
    expect(emailSvc.sentVerification.length).toBe(1);
  });

  test("signup email conflict", async () => {
    const repo = new FakeUserRepo();
    repo.users.push({ id: 1, email: "alice@example.com", password: "hash", emailVerified: true });
    const svc = newSvc(repo);
    try {
      await svc.signup("alice@example.com", "password123");
      expect.unreachable();
    } catch (err) {
      assertServiceError(err, ErrorKind.EmailConflict);
    }
  });

  test("signup bad email", async () => {
    const svc = newSvc();
    try {
      await svc.signup("not-an-email", "password123");
      expect.unreachable();
    } catch (err) {
      assertServiceError(err, ErrorKind.Validation);
    }
  });

  test("signup short password", async () => {
    const svc = newSvc();
    try {
      await svc.signup("alice@example.com", "abc");
      expect.unreachable();
    } catch (err) {
      assertServiceError(err, ErrorKind.Validation);
    }
  });

  test("login success", async () => {
    const hash = await Bun.password.hash("validpass", { algorithm: "bcrypt", cost: 10 });
    const repo = new FakeUserRepo();
    repo.users.push({ id: 9, email: "alice@example.com", password: hash, emailVerified: true });
    const svc = newSvc(repo);

    const token = await svc.login("alice@example.com", "validpass");
    expect(token).toBeTruthy();
  });

  test("login email not verified", async () => {
    const hash = await Bun.password.hash("validpass", { algorithm: "bcrypt", cost: 10 });
    const repo = new FakeUserRepo();
    repo.users.push({ id: 9, email: "alice@example.com", password: hash, emailVerified: false });
    const svc = newSvc(repo);

    try {
      await svc.login("alice@example.com", "validpass");
      expect.unreachable();
    } catch (err) {
      assertServiceError(err, ErrorKind.EmailNotVerified);
    }
  });

  test("login wrong password", async () => {
    const hash = await Bun.password.hash("validpass", { algorithm: "bcrypt", cost: 10 });
    const repo = new FakeUserRepo();
    repo.users.push({ id: 9, email: "alice@example.com", password: hash, emailVerified: true });
    const svc = newSvc(repo);

    try {
      await svc.login("alice@example.com", "wrongpass");
      expect.unreachable();
    } catch (err) {
      assertServiceError(err, ErrorKind.Unauthorized);
    }
  });

  test("login user not found", async () => {
    const svc = newSvc();
    try {
      await svc.login("nobody@example.com", "pass");
      expect.unreachable();
    } catch (err) {
      assertServiceError(err, ErrorKind.AccountNotFound);
    }
  });

  test("verify email success", async () => {
    const verifyRepo = new FakeVerifyRepo();
    verifyRepo.stored.push({
      id: 1, userId: 5, token: "validtoken",
      expiresAt: new Date(Date.now() + 3600000), used: false,
    });
    const svc = newSvc(new FakeUserRepo(), new FakeResetRepo(), verifyRepo);

    await svc.verifyEmail("validtoken");
    expect(verifyRepo.stored[0]!.used).toBe(true);
  });

  test("verify email expired", async () => {
    const verifyRepo = new FakeVerifyRepo();
    verifyRepo.stored.push({
      id: 1, token: "expiredtoken",
      expiresAt: new Date(Date.now() - 3600000), used: false,
    });
    const svc = newSvc(new FakeUserRepo(), new FakeResetRepo(), verifyRepo);

    try {
      await svc.verifyEmail("expiredtoken");
      expect.unreachable();
    } catch (err) {
      assertServiceError(err, ErrorKind.NotFound);
    }
  });

  test("verify email already used", async () => {
    const verifyRepo = new FakeVerifyRepo();
    verifyRepo.stored.push({
      id: 1, token: "usedtoken",
      expiresAt: new Date(Date.now() + 3600000), used: true,
    });
    const svc = newSvc(new FakeUserRepo(), new FakeResetRepo(), verifyRepo);

    try {
      await svc.verifyEmail("usedtoken");
      expect.unreachable();
    } catch (err) {
      assertServiceError(err, ErrorKind.NotFound);
    }
  });

  test("forgot password sends email", async () => {
    const repo = new FakeUserRepo();
    repo.users.push({ id: 1, email: "alice@example.com", password: "hash", emailVerified: true });
    const resetRepo = new FakeResetRepo();
    const emailSvc = new FakeEmailSender();
    const svc = newSvc(repo, resetRepo, new FakeVerifyRepo(), emailSvc);

    await svc.forgotPassword("alice@example.com");
    expect(resetRepo.stored.length).toBe(1);
    expect(emailSvc.sentReset.length).toBe(1);
  });

  test("forgot password user not found (silent)", async () => {
    const svc = newSvc();
    await svc.forgotPassword("nobody@example.com");
  });

  test("forgot password DB error propagates", async () => {
    const repo = new FakeUserRepo();
    repo.findErr = new Error("db unavailable");
    const svc = newSvc(repo);
    try {
      await svc.forgotPassword("alice@example.com");
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).toBe("db unavailable");
    }
  });

  test("signup email send error does not fail", async () => {
    const emailSvc = new FakeEmailSender();
    emailSvc.sendErr = new Error("smtp down");
    const svc = newSvc(new FakeUserRepo(), new FakeResetRepo(), new FakeVerifyRepo(), emailSvc);
    await svc.signup("alice@example.com", "password123");
  });

  test("forgot password email send error does not fail", async () => {
    const repo = new FakeUserRepo();
    repo.users.push({ id: 1, email: "alice@example.com", password: "hash", emailVerified: true });
    const emailSvc = new FakeEmailSender();
    emailSvc.sendErr = new Error("smtp down");
    const svc = newSvc(repo, new FakeResetRepo(), new FakeVerifyRepo(), emailSvc);
    await svc.forgotPassword("alice@example.com");
  });

  test("reset password success", async () => {
    const resetRepo = new FakeResetRepo();
    resetRepo.stored.push({
      id: 1, userId: 5, token: "validtoken",
      expiresAt: new Date(Date.now() + 10 * 60000), used: false,
    });
    const userRepo = new FakeUserRepo();
    const svc = newSvc(userRepo, resetRepo);

    await svc.resetPassword("validtoken", "newpassword123");
    expect(userRepo.updatedPassword).toBeTruthy();
    expect(resetRepo.stored[0]!.used).toBe(true);
  });

  test("reset password token not found", async () => {
    const svc = newSvc();
    try {
      await svc.resetPassword("nosuchtoken", "newpass123");
      expect.unreachable();
    } catch (err) {
      assertServiceError(err, ErrorKind.NotFound);
    }
  });

  test("reset password token already used", async () => {
    const resetRepo = new FakeResetRepo();
    resetRepo.stored.push({
      id: 2, token: "usedtoken",
      expiresAt: new Date(Date.now() + 10 * 60000), used: true,
    });
    const svc = newSvc(new FakeUserRepo(), resetRepo);
    try {
      await svc.resetPassword("usedtoken", "newpass123");
      expect.unreachable();
    } catch (err) {
      assertServiceError(err, ErrorKind.NotFound);
    }
  });

  test("reset password token expired", async () => {
    const resetRepo = new FakeResetRepo();
    resetRepo.stored.push({
      id: 3, token: "expiredtoken",
      expiresAt: new Date(Date.now() - 60000), used: false,
    });
    const svc = newSvc(new FakeUserRepo(), resetRepo);
    try {
      await svc.resetPassword("expiredtoken", "newpass123");
      expect.unreachable();
    } catch (err) {
      assertServiceError(err, ErrorKind.NotFound);
    }
  });

  test("reset password too short", async () => {
    const svc = newSvc();
    try {
      await svc.resetPassword("anytoken", "abc");
      expect.unreachable();
    } catch (err) {
      assertServiceError(err, ErrorKind.Validation);
    }
  });
});
