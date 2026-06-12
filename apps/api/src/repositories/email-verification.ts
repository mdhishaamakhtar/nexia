import { eq } from "drizzle-orm";
import { emailVerificationTokens } from "../db/schema";
import type { DB } from "../db/client";

export type EmailVerificationTokenRow = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert;

export class EmailVerificationRepository {
  constructor(private db: DB) {}

  async create(token: NewEmailVerificationToken): Promise<EmailVerificationTokenRow> {
    const [row] = await this.db
      .insert(emailVerificationTokens)
      .values(token)
      .returning();
    return row!;
  }

  async findByToken(token: string): Promise<EmailVerificationTokenRow | null> {
    const [row] = await this.db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token))
      .limit(1);
    return row ?? null;
  }

  async markAsUsed(id: number): Promise<void> {
    await this.db
      .update(emailVerificationTokens)
      .set({ used: true })
      .where(eq(emailVerificationTokens.id, id));
  }
}
