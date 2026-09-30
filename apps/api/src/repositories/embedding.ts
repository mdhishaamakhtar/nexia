import { and, asc, eq, isNull, lt, notInArray, or, sql } from "drizzle-orm";
import type { ProfileOutput } from "@nexia/shared";
import { profileEmbeddings, profiles } from "../db/schema";
import type { DB } from "../db/client";
import { toProfileOutput } from "./profile-mapper";

export interface StaleProfile {
  profile: ProfileOutput;
  revision: number;
}

export interface SearchHit {
  profileId: number;
  score: number;
}

export class EmbeddingRepository {
  constructor(private db: DB) {}

  /**
   * Profiles whose stored vector is missing or older than the profile. This is
   * the whole job queue: a save bumps `profiles.revision`, and that alone makes
   * the profile show up here until it is re-embedded.
   */
  async findStale(limit: number, skipIds: number[] = []): Promise<StaleProfile[]> {
    const stale = or(
      isNull(profileEmbeddings.profileId),
      isNull(profileEmbeddings.sourceRevision),
      lt(profileEmbeddings.sourceRevision, profiles.revision)
    );
    const rows = await this.db
      .select({ profile: profiles })
      .from(profiles)
      .leftJoin(profileEmbeddings, eq(profileEmbeddings.profileId, profiles.id))
      .where(skipIds.length ? and(stale, notInArray(profiles.id, skipIds)) : stale)
      .orderBy(asc(profiles.updatedAt))
      .limit(limit);
    return rows.map(({ profile }) => ({
      profile: toProfileOutput(profile),
      revision: profile.revision,
    }));
  }

  /**
   * Stores a vector for the given profile revision. A write carrying an older
   * revision than the one already stored is ignored, so two overlapping runs
   * can never leave the older vector behind.
   */
  async upsert(entry: {
    profileId: number;
    userId: number;
    embedding: number[];
    revision: number;
  }): Promise<void> {
    await this.db
      .insert(profileEmbeddings)
      .values({
        profileId: entry.profileId,
        userId: entry.userId,
        embedding: entry.embedding,
        sourceRevision: entry.revision,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: profileEmbeddings.profileId,
        set: {
          userId: entry.userId,
          embedding: entry.embedding,
          sourceRevision: entry.revision,
          updatedAt: new Date(),
        },
        setWhere: sql`${profileEmbeddings.sourceRevision} IS NULL OR ${profileEmbeddings.sourceRevision} <= ${entry.revision}`,
      });
  }

  /** The closest profiles to `queryEmbedding` by cosine similarity, best first. */
  async search(userId: number, queryEmbedding: number[], limit: number): Promise<SearchHit[]> {
    // One bound parameter, reused through the CTE, rather than inlining a
    // 3072-number literal into the SQL text twice.
    const vector = `[${queryEmbedding.join(",")}]`;
    const rows = await this.db.execute<{ profile_id: string; score: string }>(sql`
      WITH q AS (SELECT ${vector}::vector AS v)
      SELECT e.profile_id, 1 - (e.embedding <=> q.v) AS score
      FROM profile_embeddings e, q
      WHERE e.user_id = ${userId}
      ORDER BY e.embedding <=> q.v
      LIMIT ${limit}
    `);

    // bigint and numeric arrive as strings from a raw query.
    return rows.map((row) => ({ profileId: Number(row.profile_id), score: Number(row.score) }));
  }
}
