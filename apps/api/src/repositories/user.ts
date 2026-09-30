import { eq, sql } from "drizzle-orm";
import { users } from "../db/schema";
import type { DB } from "../db/client";

export type UserRow = typeof users.$inferSelect;

/** Postgres' unique_violation, raised when two sign-ups race for one address. */
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  const cause = (err as { cause?: { code?: string } }).cause;
  return (err as { code?: string }).code === UNIQUE_VIOLATION || cause?.code === UNIQUE_VIOLATION;
}

export class UserRepository {
  constructor(private db: DB) {}

  /** Returns null when the address is already taken, instead of throwing. */
  async create(user: { email: string; password: string }): Promise<{ id: number } | null> {
    try {
      const [row] = await this.db
        .insert(users)
        .values({ email: user.email, password: user.password, emailVerified: false })
        .returning({ id: users.id });
      return row ?? null;
    } catch (err) {
      if (isUniqueViolation(err)) return null;
      throw err;
    }
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return row ?? null;
  }

  /** What the auth middleware needs on every request, and nothing more. */
  async findSession(id: number): Promise<{ id: number; passwordChangedAt: Date | null } | null> {
    const [row] = await this.db
      .select({ id: users.id, passwordChangedAt: users.passwordChangedAt })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ?? null;
  }

  async isVerified(id: number): Promise<boolean> {
    const [row] = await this.db
      .select({ verified: users.emailVerified })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row?.verified ?? false;
  }

  /**
   * Replaces the password and stamps the change, which ends every session
   * issued before it. The reset link came to this address, so it is verified.
   */
  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        password: hashedPassword,
        emailVerified: true,
        passwordChangedAt: sql`now()`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async markEmailVerified(userId: number): Promise<void> {
    await this.db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}
