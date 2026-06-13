import { eq, and, ilike, inArray, count as sqlCount } from "drizzle-orm";
import type { ProfileOutput } from "@nexia/shared";
import {
  profiles,
  tags,
  politicalViews,
  foodRestrictions,
  movieGenres,
  bookGenres,
  hangoutPlaces,
  quotes,
  topSongs,
  associatedSongs,
} from "../db/schema";
import type { DB } from "../db/client";
import { toProfileOutput, emptyChildren, type ProfileChildren } from "./profile-mapper";
import { errNotFound } from "../services/errors";

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
    const [row] = await this.db
      .select()
      .from(profiles)
      .where(and(eq(profiles.id, id), eq(profiles.userId, userId)))
      .limit(1);
    if (!row) return null;
    const [hydrated] = await this.hydrate([row]);
    return hydrated ?? null;
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    relationshipType?: string;
    userId: number;
  }): Promise<{ profiles: ProfileOutput[]; total: number }> {
    const { page, limit, search, relationshipType, userId } = params;

    const conditions = [eq(profiles.userId, userId)];
    if (search) conditions.push(ilike(profiles.fullName, `%${search}%`));
    if (relationshipType) conditions.push(eq(profiles.relationshipType, relationshipType));
    const where = and(...conditions);

    const [totalRow] = await this.db.select({ count: sqlCount() }).from(profiles).where(where);
    const total = Number(totalRow?.count ?? 0);

    const offset = (page - 1) * limit;
    const rows = await this.db
      .select()
      .from(profiles)
      .where(where)
      .orderBy(profiles.id)
      .offset(offset)
      .limit(limit);

    const hydrated = await this.hydrate(rows);
    return { profiles: hydrated, total };
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
    const [row] = await this.db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
    if (!row) return null;
    const [hydrated] = await this.hydrate([row]);
    return hydrated ?? null;
  }

  async delete(id: number, userId: number): Promise<void> {
    await this.db.delete(profiles).where(and(eq(profiles.id, id), eq(profiles.userId, userId)));
  }

  /** Batch-loads all child associations for the given parent rows (no N+1). */
  private async hydrate(rows: ProfileRow[]): Promise<ProfileOutput[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);

    const [tagRows, pvRows, frRows, mgRows, bgRows, hpRows, quoteRows, tsRows, asRows] =
      await Promise.all([
        this.db.select().from(tags).where(inArray(tags.profileId, ids)),
        this.db.select().from(politicalViews).where(inArray(politicalViews.profileId, ids)),
        this.db.select().from(foodRestrictions).where(inArray(foodRestrictions.profileId, ids)),
        this.db.select().from(movieGenres).where(inArray(movieGenres.profileId, ids)),
        this.db.select().from(bookGenres).where(inArray(bookGenres.profileId, ids)),
        this.db.select().from(hangoutPlaces).where(inArray(hangoutPlaces.profileId, ids)),
        this.db.select().from(quotes).where(inArray(quotes.profileId, ids)),
        this.db.select().from(topSongs).where(inArray(topSongs.profileId, ids)),
        this.db.select().from(associatedSongs).where(inArray(associatedSongs.profileId, ids)),
      ]);

    const childrenById = new Map<number, ProfileChildren>();
    for (const id of ids) childrenById.set(id, emptyChildren());

    for (const r of tagRows) childrenById.get(r.profileId)?.tags.push(r);
    for (const r of pvRows) childrenById.get(r.profileId)?.politicalViews.push(r);
    for (const r of frRows) childrenById.get(r.profileId)?.foodRestrictions.push(r);
    for (const r of mgRows) childrenById.get(r.profileId)?.movieGenres.push(r);
    for (const r of bgRows) childrenById.get(r.profileId)?.bookGenres.push(r);
    for (const r of hpRows) childrenById.get(r.profileId)?.hangoutPlaces.push(r);
    for (const r of quoteRows) childrenById.get(r.profileId)?.quotes.push(r);
    for (const r of tsRows) childrenById.get(r.profileId)?.topSongs.push(r);
    for (const r of asRows) {
      const bucket = childrenById.get(r.profileId);
      if (bucket) bucket.associatedSong = r;
    }

    return rows.map((row) => toProfileOutput(row, childrenById.get(row.id) ?? emptyChildren()));
  }
}
