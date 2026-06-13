import { eq } from "drizzle-orm";
import { passwordResetTokens } from "../db/schema";
import type { DB } from "../db/client";

export type PasswordResetTokenRow = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;

export class PasswordResetRepository {
  constructor(private db: DB) {}

  async create(token: NewPasswordResetToken): Promise<PasswordResetTokenRow> {
    const [row] = await this.db.insert(passwordResetTokens).values(token).returning();
    return row!;
  }

  async findByToken(token: string): Promise<PasswordResetTokenRow | null> {
    const [row] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    return row ?? null;
  }

  async markAsUsed(id: number): Promise<void> {
    await this.db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, id));
  }
}
