import { eq, ilike, and, sql, inArray, count, notInArray } from "drizzle-orm";
import { users } from "../db/schema";
import type { DB } from "../db/client";

export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export class UserRepository {
  constructor(private db: DB) {}

  async create(user: NewUser): Promise<UserRow> {
    const [row] = await this.db.insert(users).values(user).returning();
    return row!;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row ?? null;
  }

  async findById(id: number): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ?? null;
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateEmailVerified(userId: number): Promise<void> {
    await this.db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}
