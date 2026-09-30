import { and, desc, eq, gt, sql } from "drizzle-orm";
import { emailVerificationTokens, passwordResetTokens } from "../db/schema";
import type { DB } from "../db/client";

type TokenTable = typeof passwordResetTokens | typeof emailVerificationTokens;

/**
 * Single-use links sent by email: password resets and address verification.
 * Both tables have the same shape, so one class serves either. Only the SHA-256
 * of a token is ever stored; the caller hashes before every call.
 */
export class EmailTokenRepository {
  constructor(
    private db: DB,
    private table: TokenTable
  ) {}

  async create(entry: { userId: number; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.db.insert(this.table).values({
      userId: entry.userId,
      token: entry.tokenHash,
      expiresAt: entry.expiresAt,
    });
  }

  /**
   * Marks a live token used and returns its owner, in one statement. Two
   * requests racing with the same link cannot both succeed.
   */
  async claim(tokenHash: string): Promise<{ userId: number } | null> {
    const [row] = await this.db
      .update(this.table)
      .set({ used: true })
      .where(
        and(
          eq(this.table.token, tokenHash),
          eq(this.table.used, false),
          gt(this.table.expiresAt, sql`now()`)
        )
      )
      .returning({ userId: this.table.userId });
    return row ?? null;
  }

  /** The owner of a token that was already used, for idempotent verification. */
  async findUsed(tokenHash: string): Promise<{ userId: number } | null> {
    const [row] = await this.db
      .select({ userId: this.table.userId })
      .from(this.table)
      .where(and(eq(this.table.token, tokenHash), eq(this.table.used, true)))
      .limit(1);
    return row ?? null;
  }

  /** When the most recent link for this user was issued. */
  async lastIssuedAt(userId: number): Promise<Date | null> {
    const [row] = await this.db
      .select({ createdAt: this.table.createdAt })
      .from(this.table)
      .where(eq(this.table.userId, userId))
      .orderBy(desc(this.table.createdAt))
      .limit(1);
    return row?.createdAt ?? null;
  }

  /** Voids every outstanding link for the user, so only the newest one works. */
  async revokeAll(userId: number): Promise<void> {
    await this.db
      .update(this.table)
      .set({ used: true })
      .where(and(eq(this.table.userId, userId), eq(this.table.used, false)));
  }
}
