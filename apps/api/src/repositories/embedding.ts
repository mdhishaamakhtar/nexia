import { eq, sql } from "drizzle-orm";
import { profileEmbeddings } from "../db/schema";
import type { DB } from "../db/client";
import type { Logger } from "../logging/logger";

export type SearchResult = {
  profileId: number;
  score: number;
  payload: Record<string, unknown>;
};

export class EmbeddingRepository {
  constructor(
    private db: DB,
    private logger: Logger,
  ) {}

  async upsertProfile(
    profileId: number,
    userId: number,
    embedding: number[],
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.db
        .insert(profileEmbeddings)
        .values({
          profileId,
          userId,
          embedding,
          payload,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: profileEmbeddings.profileId,
          set: {
            userId,
            embedding,
            payload,
            updatedAt: new Date(),
          },
        });
      this.logger.info({ profileId, userId }, "embedding upserted");
    } catch (err) {
      this.logger.error({ profileId, err }, "embedding upsert failed");
      throw err;
    }
  }

  async deleteProfile(profileId: number): Promise<void> {
    try {
      await this.db
        .delete(profileEmbeddings)
        .where(eq(profileEmbeddings.profileId, profileId));
      this.logger.info({ profileId }, "embedding deleted");
    } catch (err) {
      this.logger.error({ profileId, err }, "embedding delete failed");
      throw err;
    }
  }

  async searchContext(
    userId: number,
    queryEmbedding: number[],
    limit: number,
  ): Promise<SearchResult[]> {
    // Format embedding as pgvector literal
    const vecStr = `[${queryEmbedding.join(",")}]`;
    const vecLiteral = sql.raw(`'${vecStr}'::vector`);

    const rows = await this.db.execute<{
      profile_id: number;
      score: number;
      payload: Record<string, unknown>;
    }>(
      sql`
        SELECT profile_id,
               1 - (embedding <=> ${vecLiteral}) AS score,
               payload
        FROM   profile_embeddings
        WHERE  user_id = ${userId}
        ORDER  BY embedding <=> ${vecLiteral}
        LIMIT  ${limit}
      `,
    );

    const results: SearchResult[] = [];
    for (const row of rows) {
      results.push({
        profileId: row.profile_id,
        score: Number(row.score),
        payload: row.payload,
      });
    }
    return results;
  }
}
