import type { Logger } from "../logging/logger";
import { errValidation } from "./errors";
import { applyDerivedZodiac } from "./zodiac";

export interface ProfileRepo {
  create(input: { profile: Record<string, unknown>; tags?: Array<Record<string, unknown>>; politicalViews?: Array<Record<string, unknown>>; foodRestrictions?: Array<Record<string, unknown>>; movieGenres?: Array<Record<string, unknown>>; bookGenres?: Array<Record<string, unknown>>; hangoutPlaces?: Array<Record<string, unknown>>; quotes?: Array<Record<string, unknown>>; topSongs?: Array<Record<string, unknown>>; associatedSong?: Record<string, unknown> | null }): Promise<{ id: number; userId: number }>;
  findById(id: number, userId: number): Promise<Record<string, unknown> | null>;
  findAll(params: { page: number; limit: number; search?: string; relationshipType?: string; userId: number }): Promise<{ profiles: Record<string, unknown>[]; total: number }>;
  update(profileId: number, userId: number, input: { profile: Partial<Record<string, unknown>>; tags?: Array<Record<string, unknown>>; politicalViews?: Array<Record<string, unknown>>; foodRestrictions?: Array<Record<string, unknown>>; movieGenres?: Array<Record<string, unknown>>; bookGenres?: Array<Record<string, unknown>>; hangoutPlaces?: Array<Record<string, unknown>>; quotes?: Array<Record<string, unknown>>; topSongs?: Array<Record<string, unknown>>; associatedSong?: Record<string, unknown> | null }): Promise<Record<string, unknown>>;
  loadForEmbedding(profileId: number): Promise<Record<string, unknown> | null>;
  delete(id: number, userId: number): Promise<void>;
}

export interface EmbeddingQueue {
  enqueueEmbeddingTask(profileId: number): Promise<void>;
  enqueueDeletionTask(profileId: number): Promise<void>;
}

export class ProfileService {
  constructor(
    private repo: ProfileRepo,
    private queue: EmbeddingQueue | null,
    private logger: Logger,
  ) {}

  async createProfile(profile: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const topSongs = (profile.top_songs as Array<Record<string, unknown>>) ?? [];
    if (topSongs.length > 3) {
      throw errValidation("cannot have more than 3 top songs");
    }

    applyDerivedZodiac(profile as { birthday?: string | null; zodiac_sign?: string | null });

    const created = await this.repo.create(mapProfileToRepoInput(profile, userId));
    const result = await this.repo.findById(created.id, userId);

    if (this.queue) {
      try {
        await this.queue.enqueueEmbeddingTask(created.id);
      } catch (err) {
        this.logger.warn({ profileId: created.id, err: String(err) }, "failed to enqueue profile embedding task");
      }
    }

    return result!;
  }

  async getProfile(id: number, userId: number): Promise<Record<string, unknown> | null> {
    return this.repo.findById(id, userId);
  }

  async listProfiles(page: number, limit: number, search: string | undefined, relationshipType: string | undefined, userId: number): Promise<{ profiles: Record<string, unknown>[]; total: number }> {
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100;
    return this.repo.findAll({ page, limit, search, relationshipType, userId });
  }

  async updateProfile(id: number, profile: Record<string, unknown>, userId: number): Promise<Record<string, unknown>> {
    const topSongs = (profile.top_songs as Array<Record<string, unknown>>) ?? [];
    if (topSongs.length > 3) {
      throw errValidation("cannot have more than 3 top songs");
    }

    applyDerivedZodiac(profile as { birthday?: string | null; zodiac_sign?: string | null });

    const result = await this.repo.update(id, userId, mapProfileToRepoUpdate(profile));

    if (this.queue) {
      try {
        await this.queue.enqueueEmbeddingTask(id);
      } catch (err) {
        this.logger.warn({ profileId: id, err: String(err) }, "failed to enqueue profile embedding task");
      }
    }

    return result;
  }

  async deleteProfile(id: number, userId: number): Promise<void> {
    await this.repo.delete(id, userId);

    if (this.queue) {
      try {
        await this.queue.enqueueDeletionTask(id);
      } catch (err) {
        this.logger.warn({ profileId: id, err: String(err) }, "failed to enqueue profile deletion task");
      }
    }
  }
}

function mapProfileToRepoInput(profile: Record<string, unknown>, userId: number) {
  return {
    profile: {
      userId,
      fullName: profile.full_name,
      relationshipType: profile.relationship_type,
      bio: profile.bio,
      profession: profile.profession,
      longTermGoals: profile.long_term_goals,
      birthday: profile.birthday ?? null,
      zodiacSign: profile.zodiac_sign ?? null,
      musicPreference: profile.music_preference,
      favoriteMovie: profile.favorite_movie,
      favoriteBook: profile.favorite_book,
      favoriteMemory: profile.favorite_memory,
      notes: profile.notes ?? "",
    },
    tags: (profile.tags as Array<Record<string, unknown>>)?.map((t) => ({ tag: t.tag })),
    politicalViews: (profile.political_views as Array<Record<string, unknown>>)?.map((v) => ({ view: v.view })),
    foodRestrictions: (profile.food_restrictions as Array<Record<string, unknown>>)?.map((r) => ({ restriction: r.restriction })),
    movieGenres: (profile.movie_genres as Array<Record<string, unknown>>)?.map((g) => ({ genre: g.genre })),
    bookGenres: (profile.book_genres as Array<Record<string, unknown>>)?.map((g) => ({ genre: g.genre })),
    hangoutPlaces: (profile.hangout_places as Array<Record<string, unknown>>)?.map((p) => ({ place: p.place })),
    quotes: (profile.quotes as Array<Record<string, unknown>>)?.map((q) => ({ quote: q.quote })),
    topSongs: (profile.top_songs as Array<Record<string, unknown>>)?.map((s) => ({ name: s.name, artist: s.artist })),
    associatedSong: profile.associated_song
      ? { name: (profile.associated_song as Record<string, unknown>).name, artist: (profile.associated_song as Record<string, unknown>).artist }
      : null,
  };
}

function mapProfileToRepoUpdate(profile: Record<string, unknown>) {
  return {
    profile: {
      fullName: profile.full_name,
      relationshipType: profile.relationship_type,
      bio: profile.bio,
      profession: profile.profession,
      longTermGoals: profile.long_term_goals,
      birthday: profile.birthday ?? null,
      zodiacSign: profile.zodiac_sign ?? null,
      musicPreference: profile.music_preference,
      favoriteMovie: profile.favorite_movie,
      favoriteBook: profile.favorite_book,
      favoriteMemory: profile.favorite_memory,
      notes: profile.notes,
    },
    tags: (profile.tags as Array<Record<string, unknown>>)?.map((t) => ({ tag: t.tag })),
    politicalViews: (profile.political_views as Array<Record<string, unknown>>)?.map((v) => ({ view: v.view })),
    foodRestrictions: (profile.food_restrictions as Array<Record<string, unknown>>)?.map((r) => ({ restriction: r.restriction })),
    movieGenres: (profile.movie_genres as Array<Record<string, unknown>>)?.map((g) => ({ genre: g.genre })),
    bookGenres: (profile.book_genres as Array<Record<string, unknown>>)?.map((g) => ({ genre: g.genre })),
    hangoutPlaces: (profile.hangout_places as Array<Record<string, unknown>>)?.map((p) => ({ place: p.place })),
    quotes: (profile.quotes as Array<Record<string, unknown>>)?.map((q) => ({ quote: q.quote })),
    topSongs: (profile.top_songs as Array<Record<string, unknown>>)?.map((s) => ({ name: s.name, artist: s.artist })),
    associatedSong: profile.associated_song
      ? { name: (profile.associated_song as Record<string, unknown>).name, artist: (profile.associated_song as Record<string, unknown>).artist }
      : null,
  };
}
