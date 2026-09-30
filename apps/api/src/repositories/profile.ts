import { and, asc, count, eq, ilike, inArray, sql } from "drizzle-orm";
import type { ProfileInput, ProfileOutput, ProfileSummary, RelationshipType } from "@nexia/shared";
import { profiles } from "../db/schema";
import type { DB } from "../db/client";
import { errNotFound } from "../services/errors";
import {
  toNewProfileRow,
  toProfileOutput,
  toProfilePatch,
  toProfileSummary,
} from "./profile-mapper";

export interface ListProfilesParams {
  userId: number;
  page: number;
  limit: number;
  search?: string;
  relationshipType?: RelationshipType;
}

/** Escapes LIKE wildcards so a search for "50%" finds "50%", not everything. */
function likeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export class ProfileRepository {
  constructor(private db: DB) {}

  async create(userId: number, input: ProfileInput): Promise<ProfileOutput> {
    const [row] = await this.db.insert(profiles).values(toNewProfileRow(userId, input)).returning();
    return toProfileOutput(row!);
  }

  async findById(id: number, userId: number): Promise<ProfileOutput | null> {
    const [row] = await this.db
      .select()
      .from(profiles)
      .where(and(eq(profiles.id, id), eq(profiles.userId, userId)))
      .limit(1);
    return row ? toProfileOutput(row) : null;
  }

  /** Loads several profiles, returned in the order of `ids`. Missing ids are skipped. */
  async findByIds(ids: number[], userId: number): Promise<ProfileOutput[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select()
      .from(profiles)
      .where(and(inArray(profiles.id, ids), eq(profiles.userId, userId)));
    const byId = new Map(rows.map((row) => [row.id, toProfileOutput(row)]));
    return ids.flatMap((id) => byId.get(id) ?? []);
  }

  async findAll(
    params: ListProfilesParams
  ): Promise<{ profiles: ProfileSummary[]; total: number }> {
    const { userId, page, limit, search, relationshipType } = params;

    const conditions = [eq(profiles.userId, userId)];
    if (search) conditions.push(ilike(profiles.fullName, `%${likeLiteral(search)}%`));
    if (relationshipType) conditions.push(eq(profiles.relationshipType, relationshipType));
    const where = and(...conditions);

    const [totalRow] = await this.db.select({ total: count() }).from(profiles).where(where);

    // Alphabetical, the way people look for someone in a book; id breaks ties
    // so paging stays stable when two people share a name.
    const rows = await this.db
      .select({
        id: profiles.id,
        fullName: profiles.fullName,
        pronouns: profiles.pronouns,
        relationshipType: profiles.relationshipType,
        birthday: profiles.birthday,
        tags: profiles.tags,
      })
      .from(profiles)
      .where(where)
      .orderBy(sql`lower(${profiles.fullName})`, asc(profiles.id))
      .offset((page - 1) * limit)
      .limit(limit);

    return { profiles: rows.map(toProfileSummary), total: Number(totalRow?.total ?? 0) };
  }

  /**
   * Merges `patch` into the profile: keys that are `undefined` keep their stored
   * value. Every write bumps `revision`, which is what marks the embedding stale.
   */
  async update(id: number, userId: number, patch: Partial<ProfileInput>): Promise<ProfileOutput> {
    const [row] = await this.db
      .update(profiles)
      .set({
        ...toProfilePatch(patch),
        revision: sql`${profiles.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(profiles.id, id), eq(profiles.userId, userId)))
      .returning();
    if (!row) throw errNotFound();
    return toProfileOutput(row);
  }

  async delete(id: number, userId: number): Promise<void> {
    // `returning` is what makes "deleted nothing" distinguishable from "deleted
    // it". Without it a DELETE for a missing row — or for a row owned by
    // somebody else — succeeds silently and the caller reports success.
    const deleted = await this.db
      .delete(profiles)
      .where(and(eq(profiles.id, id), eq(profiles.userId, userId)))
      .returning({ id: profiles.id });

    if (deleted.length === 0) throw errNotFound();
  }
}
