import { eq, and, ilike, count as sqlCount } from "drizzle-orm";
import type { ProfileOutput, ProfileSummary } from "@nexia/shared";
import {
  profiles,
  tags,
  politicalViews,
  foodRestrictions,
  movieGenres,
  bookGenres,
  hangoutPlaces,
  quotes,
  favoriteMemories,
  topSongs,
  associatedSongs,
} from "../db/schema";
import type { DB } from "../db/client";
import { toProfileOutput, toProfileSummary } from "./profile-mapper";
import { errNotFound } from "../services/errors";

/**
 * `with` clause that hydrates a profile and every child collection in one
 * relational query. Drizzle emits lateral json-aggregation, so the result is a
 * single row per profile (no cartesian explosion from the ten one-to-many
 * tables).
 */
const FULL_PROFILE_WITH = {
  tags: true,
  politicalViews: true,
  foodRestrictions: true,
  movieGenres: true,
  bookGenres: true,
  hangoutPlaces: true,
  quotes: true,
  favoriteMemories: true,
  topSongs: true,
  associatedSong: true,
} as const;

export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

/** Child collections accepted by create/update, keyed to their value columns. */
export interface ProfileChildInput {
  tags?: Array<{ tag: string }>;
  politicalViews?: Array<{ view: string }>;
  foodRestrictions?: Array<{ restriction: string }>;
  movieGenres?: Array<{ genre: string }>;
  bookGenres?: Array<{ genre: string }>;
  hangoutPlaces?: Array<{ place: string }>;
  quotes?: Array<{ quote: string }>;
  favoriteMemories?: Array<{ memory: string }>;
  topSongs?: Array<{ name: string; artist: string }>;
  associatedSong?: { name: string; artist: string } | null;
}

export interface CreateProfileInput extends ProfileChildInput {
  profile: Omit<NewProfile, "id">;
}

export interface UpdateProfileInput extends ProfileChildInput {
  profile: Partial<Omit<NewProfile, "id" | "userId">>;
}

export class ProfileRepository {
  constructor(private db: DB) {}

  async create(data: CreateProfileInput): Promise<ProfileOutput> {
    const id = await this.db.transaction(async (tx) => {
      const [profile] = await tx.insert(profiles).values(data.profile).returning();
      if (!profile) throw new Error("Failed to create profile — insert returned no row");

      const pid = profile.id;
      if (data.tags?.length) {
        await tx.insert(tags).values(data.tags.map((t) => ({ ...t, profileId: pid })));
      }
      if (data.politicalViews?.length) {
        await tx
          .insert(politicalViews)
          .values(data.politicalViews.map((v) => ({ ...v, profileId: pid })));
      }
      if (data.foodRestrictions?.length) {
        await tx
          .insert(foodRestrictions)
          .values(data.foodRestrictions.map((r) => ({ ...r, profileId: pid })));
      }
      if (data.movieGenres?.length) {
        await tx
          .insert(movieGenres)
          .values(data.movieGenres.map((g) => ({ ...g, profileId: pid })));
      }
      if (data.bookGenres?.length) {
        await tx.insert(bookGenres).values(data.bookGenres.map((g) => ({ ...g, profileId: pid })));
      }
      if (data.hangoutPlaces?.length) {
        await tx
          .insert(hangoutPlaces)
          .values(data.hangoutPlaces.map((p) => ({ ...p, profileId: pid })));
      }
      if (data.quotes?.length) {
        await tx.insert(quotes).values(data.quotes.map((q) => ({ ...q, profileId: pid })));
      }
      if (data.favoriteMemories?.length) {
        await tx
          .insert(favoriteMemories)
          .values(data.favoriteMemories.map((m) => ({ ...m, profileId: pid })));
      }
      if (data.topSongs?.length) {
        await tx.insert(topSongs).values(data.topSongs.map((s) => ({ ...s, profileId: pid })));
      }
      if (data.associatedSong) {
        await tx.insert(associatedSongs).values({ ...data.associatedSong, profileId: pid });
      }

      return pid;
    });

    const created = await this.findById(id, data.profile.userId);
    if (!created) throw errNotFound();
    return created;
  }

  async findById(id: number, userId: number): Promise<ProfileOutput | null> {
    const row = await this.db.query.profiles.findFirst({
      where: and(eq(profiles.id, id), eq(profiles.userId, userId)),
      with: FULL_PROFILE_WITH,
    });
    if (!row) return null;
    return toProfileOutput(row, row);
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    relationshipType?: string;
    userId: number;
  }): Promise<{ profiles: ProfileSummary[]; total: number }> {
    const { page, limit, search, relationshipType, userId } = params;

    const conditions = [eq(profiles.userId, userId)];
    if (search) conditions.push(ilike(profiles.fullName, `%${search}%`));
    if (relationshipType) conditions.push(eq(profiles.relationshipType, relationshipType));
    const where = and(...conditions);

    const [totalRow] = await this.db.select({ count: sqlCount() }).from(profiles).where(where);
    const total = Number(totalRow?.count ?? 0);

    // The list/search surfaces only render name, relationship, zodiac and tags,
    // so project just those columns plus the tags relation — the other nine
    // child collections are never fetched.
    const rows = await this.db.query.profiles.findMany({
      columns: { id: true, fullName: true, relationshipType: true, zodiacSign: true },
      with: { tags: true },
      where,
      orderBy: profiles.id,
      offset: (page - 1) * limit,
      limit,
    });

    return { profiles: rows.map(toProfileSummary), total };
  }

  async update(
    profileId: number,
    userId: number,
    data: UpdateProfileInput
  ): Promise<ProfileOutput> {
    await this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)))
        .limit(1);
      if (!existing) throw errNotFound();

      const [updated] = await tx
        .update(profiles)
        .set({ ...data.profile, updatedAt: new Date() })
        .where(eq(profiles.id, profileId))
        .returning({ id: profiles.id });
      if (!updated) throw errNotFound();

      // Full-overwrite semantics: when a child collection is provided, replace it.
      if (data.tags !== undefined) {
        await tx.delete(tags).where(eq(tags.profileId, profileId));
        if (data.tags.length) {
          await tx.insert(tags).values(data.tags.map((t) => ({ ...t, profileId })));
        }
      }
      if (data.politicalViews !== undefined) {
        await tx.delete(politicalViews).where(eq(politicalViews.profileId, profileId));
        if (data.politicalViews.length) {
          await tx
            .insert(politicalViews)
            .values(data.politicalViews.map((v) => ({ ...v, profileId })));
        }
      }
      if (data.foodRestrictions !== undefined) {
        await tx.delete(foodRestrictions).where(eq(foodRestrictions.profileId, profileId));
        if (data.foodRestrictions.length) {
          await tx
            .insert(foodRestrictions)
            .values(data.foodRestrictions.map((r) => ({ ...r, profileId })));
        }
      }
      if (data.movieGenres !== undefined) {
        await tx.delete(movieGenres).where(eq(movieGenres.profileId, profileId));
        if (data.movieGenres.length) {
          await tx.insert(movieGenres).values(data.movieGenres.map((g) => ({ ...g, profileId })));
        }
      }
      if (data.bookGenres !== undefined) {
        await tx.delete(bookGenres).where(eq(bookGenres.profileId, profileId));
        if (data.bookGenres.length) {
          await tx.insert(bookGenres).values(data.bookGenres.map((g) => ({ ...g, profileId })));
        }
      }
      if (data.hangoutPlaces !== undefined) {
        await tx.delete(hangoutPlaces).where(eq(hangoutPlaces.profileId, profileId));
        if (data.hangoutPlaces.length) {
          await tx
            .insert(hangoutPlaces)
            .values(data.hangoutPlaces.map((p) => ({ ...p, profileId })));
        }
      }
      if (data.quotes !== undefined) {
        await tx.delete(quotes).where(eq(quotes.profileId, profileId));
        if (data.quotes.length) {
          await tx.insert(quotes).values(data.quotes.map((q) => ({ ...q, profileId })));
        }
      }
      if (data.favoriteMemories !== undefined) {
        await tx.delete(favoriteMemories).where(eq(favoriteMemories.profileId, profileId));
        if (data.favoriteMemories.length) {
          await tx
            .insert(favoriteMemories)
            .values(data.favoriteMemories.map((m) => ({ ...m, profileId })));
        }
      }
      if (data.topSongs !== undefined) {
        await tx.delete(topSongs).where(eq(topSongs.profileId, profileId));
        if (data.topSongs.length) {
          await tx.insert(topSongs).values(data.topSongs.map((s) => ({ ...s, profileId })));
        }
      }
      if (data.associatedSong !== undefined) {
        await tx.delete(associatedSongs).where(eq(associatedSongs.profileId, profileId));
        if (data.associatedSong) {
          await tx.insert(associatedSongs).values({ ...data.associatedSong, profileId });
        }
      }
    });

    const result = await this.findById(profileId, userId);
    if (!result) throw errNotFound();
    return result;
  }

  /** Loads a fully-hydrated profile without a user guard (queue worker use). */
  async loadForEmbedding(profileId: number): Promise<ProfileOutput | null> {
    const row = await this.db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      with: FULL_PROFILE_WITH,
    });
    if (!row) return null;
    return toProfileOutput(row, row);
  }

  async delete(id: number, userId: number): Promise<void> {
    await this.db.delete(profiles).where(and(eq(profiles.id, id), eq(profiles.userId, userId)));
  }
}
