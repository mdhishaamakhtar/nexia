import { createHash, randomBytes } from "node:crypto";
import type { Logger } from "../logging/logger";
import { errEmailNotVerified, errNotFound, errUnauthorized } from "./errors";

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * At most one link email per address per minute. The endpoints that send them
 * answer the same way whether or not an account exists, so without this they
 * could be used to flood somebody's inbox.
 */
const EMAIL_COOLDOWN_MS = 60 * 1000;

export interface UserRepo {
  /** Null when the address is already taken. */
  create(user: { email: string; password: string }): Promise<{ id: number } | null>;
  findByEmail(
    email: string
  ): Promise<{ id: number; email: string; password: string; emailVerified: boolean } | null>;
  isVerified(id: number): Promise<boolean>;
  updatePassword(userId: number, hashedPassword: string): Promise<void>;
  markEmailVerified(userId: number): Promise<void>;
}

export interface TokenRepo {
  create(entry: { userId: number; tokenHash: string; expiresAt: Date }): Promise<void>;
  claim(tokenHash: string): Promise<{ userId: number } | null>;
  findUsed(tokenHash: string): Promise<{ userId: number } | null>;
  lastIssuedAt(userId: number): Promise<Date | null>;
  revokeAll(userId: number): Promise<void>;
}

export interface EmailSender {
  sendVerificationEmail(toEmail: string, token: string): Promise<void>;
  sendPasswordResetEmail(toEmail: string, token: string): Promise<void>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hashed: string): Promise<boolean>;
}

/** Links carry 32 random bytes; only their SHA-256 is stored. */
function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Sign-up, sign-in and the two email-link flows. Inputs arrive already
 * validated and normalised by the shared schemas (emails lower-cased, password
 * rules applied), so nothing here re-checks them.
 *
 * Every endpoint that takes only an email answers the same way whether or not
 * an account exists, and sign-in gives one message for "no such account" and
 * "wrong password", so none of them can be used to learn who has an account.
 */
export class AuthService {
  /** A real hash to compare against when there is no user, so both paths cost the same. */
  private dummyHash: Promise<string>;

  constructor(
    private users: UserRepo,
    private resetTokens: TokenRepo,
    private verifyTokens: TokenRepo,
    private email: EmailSender,
    private hasher: PasswordHasher,
    private logger: Logger
  ) {
    this.dummyHash = hasher.hash(randomBytes(16).toString("hex"));
  }

  /**
   * Creates the account and sends a verification link. For an address that
   * already has an unverified account this re-sends the link instead, which is
   * what someone whose first email never arrived needs; for a verified one it
   * does nothing. The response is the same in every case.
   */
  async signup(email: string, password: string): Promise<void> {
    // Hash first on every path, so the response time does not reveal which one ran.
    const hashed = await this.hasher.hash(password);

    const existing = await this.users.findByEmail(email);
    if (existing) {
      if (!existing.emailVerified) await this.sendVerification(existing.id, email);
      return;
    }

    const created = await this.users.create({ email, password: hashed });
    // Null means a concurrent sign-up for the same address won the race.
    if (created) await this.sendVerification(created.id, email);
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (user && !user.emailVerified) await this.sendVerification(user.id, email);
  }

  /** Checks the credentials and returns the user id to start a session for. */
  async login(email: string, password: string): Promise<number> {
    const user = await this.users.findByEmail(email);
    const valid = await this.hasher.verify(password, user?.password ?? (await this.dummyHash));
    if (!user || !valid) throw errUnauthorized();

    // Only reachable with the right password, so it reveals nothing new.
    if (!user.emailVerified) throw errEmailNotVerified();

    return user.id;
  }

  /**
   * Opening a verification link twice is not an error: once the account is
   * verified, any link that belonged to it just confirms that.
   */
  async verifyEmail(token: string): Promise<void> {
    const hash = hashToken(token);

    const claimed = await this.verifyTokens.claim(hash);
    if (claimed) {
      await this.users.markEmailVerified(claimed.userId);
      return;
    }

    const used = await this.verifyTokens.findUsed(hash);
    if (used && (await this.users.isVerified(used.userId))) return;

    throw errNotFound("verification link expired or unknown");
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) return;
    if (await this.onCooldown(this.resetTokens, user.id)) return;

    const { token, hash } = newToken();
    await this.resetTokens.revokeAll(user.id);
    await this.resetTokens.create({
      userId: user.id,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });
    await this.trySend(() => this.email.sendPasswordResetEmail(email, token), user.id, "reset");
  }

  /**
   * Sets a new password from a reset link. The link is claimed atomically, so
   * it works exactly once; changing the password ends every existing session.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const claimed = await this.resetTokens.claim(hashToken(token));
    if (!claimed) throw errNotFound("reset link expired or already used");

    await this.users.updatePassword(claimed.userId, await this.hasher.hash(newPassword));
    await this.resetTokens.revokeAll(claimed.userId);
  }

  private async sendVerification(userId: number, email: string): Promise<void> {
    if (await this.onCooldown(this.verifyTokens, userId)) return;

    const { token, hash } = newToken();
    await this.verifyTokens.revokeAll(userId);
    await this.verifyTokens.create({
      userId,
      tokenHash: hash,
      expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    });
    await this.trySend(
      () => this.email.sendVerificationEmail(email, token),
      userId,
      "verification"
    );
  }

  private async onCooldown(repo: TokenRepo, userId: number): Promise<boolean> {
    const last = await repo.lastIssuedAt(userId);
    return last !== null && Date.now() - last.getTime() < EMAIL_COOLDOWN_MS;
  }

  /**
   * A failed send is logged, not surfaced: the response must not differ from
   * the no-account case, and the person can ask for the link again.
   */
  private async trySend(send: () => Promise<void>, userId: number, kind: string): Promise<void> {
    try {
      await send();
    } catch (err) {
      this.logger.warn({ userId, err }, `failed to send ${kind} email`);
    }
  }
}
