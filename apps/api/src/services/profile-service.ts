import type { Logger } from "../logging/logger";
import type { ProfileInput } from "@nexia/shared";
import { errValidation } from "./errors";
import { applyDerivedZodiac } from "./zodiac";

export interface ProfileRepo {
  create(input: {
    profile: Record<string, unknown>;
    tags?: Array<{ tag: string }>;
    politicalViews?: Array<{ view: string }>;
    foodRestrictions?: Array<{ restriction: string }>;
    movieGenres?: Array<{ genre: string }>;
    bookGenres?: Array<{ genre: string }>;
    hangoutPlaces?: Array<{ place: string }>;
    quotes?: Array<{ quote: string }>;
    topSongs?: Array<{ name: string; artist: string }>;
    associatedSong?: { name: string; artist: string } | null;
  }): Promise<{ id: number; userId: number }>;
  findById(id: number, userId: number): Promise<Record<string, unknown> | null>;
  findAll(params: { page: number; limit: number; search?: string; relationshipType?: string; userId: number }): Promise<{ profiles: Record<string, unknown>[]; total: number }>;
  update(profileId: number, userId: number, input: {
    profile: Partial<Record<string, unknown>>;
    tags?: Array<{ tag: string }>;
    politicalViews?: Array<{ view: string }>;
    foodRestrictions?: Array<{ restriction: string }>;
    movieGenres?: Array<{ genre: string }>;
    bookGenres?: Array<{ genre: string }>;
    hangoutPlaces?: Array<{ place: string }>;
    quotes?: Array<{ quote: string }>;
    topSongs?: Array<{ name: string; artist: string }>;
    associatedSong?: { name: string; artist: string } | null;
  }): Promise<Record<string, unknown>>;
  loadForEmbedding(profileId: number): Promise<Record<string, unknown> | null>;
  delete(id: number, userId: number): Promise<void>;
}

export interface EmbeddingQueue {
  enqueueEmbeddingTask(profileId: number): Promise<void>;
  enqueueDeletionTask(profileId: number): Promise<void>;
}

type TopSongInput = { name: string; artist: string };

export class ProfileService {
  constructor(
    private repo: ProfileRepo,
    private queue: EmbeddingQueue | null,
    private logger: Logger,
  ) {}

  async createProfile(profile: ProfileInput, userId: number): Promise<Record<string, unknown>> {
    const topSongs = profile.top_songs ?? [];
    if (topSongs.length > 3) {
      throw errValidation("cannot have more than 3 top songs");
    }

    applyDerivedZodiac(profile);

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

  async updateProfile(id: number, profile: Partial<ProfileInput>, userId: number): Promise<Record<string, unknown>> {
    const topSongs = profile.top_songs ?? [];
    if (topSongs.length > 3) {
      throw errValidation("cannot have more than 3 top songs");
    }

    applyDerivedZodiac(profile);

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

function mapProfileToRepoInput(p: ProfileInput, userId: number) {
  return {
    profile: {
      userId,
      fullName: p.full_name,
      relationshipType: p.relationship_type,
      bio: p.bio ?? "",
      profession: p.profession ?? "",
      longTermGoals: p.long_term_goals ?? "",
      birthday: p.birthday ?? null,
      zodiacSign: p.zodiac_sign ?? null,
      musicPreference: p.music_preference ?? "",
      favoriteMovie: p.favorite_movie ?? "",
      favoriteBook: p.favorite_book ?? "",
      favoriteMemory: p.favorite_memory ?? "",
      notes: p.notes ?? "",
    },
    tags: p.tags?.map((t) => ({ tag: t.tag })),
    politicalViews: p.political_views?.map((v) => ({ view: v.view })),
    foodRestrictions: p.food_restrictions?.map((r) => ({ restriction: r.restriction })),
    movieGenres: p.movie_genres?.map((g) => ({ genre: g.genre })),
    bookGenres: p.book_genres?.map((g) => ({ genre: g.genre })),
    hangoutPlaces: p.hangout_places?.map((hp) => ({ place: hp.place })),
    quotes: p.quotes?.map((q) => ({ quote: q.quote })),
    topSongs: (p.top_songs as TopSongInput[] | undefined)?.map((s) => ({ name: s.name, artist: s.artist })),
    associatedSong: p.associated_song
      ? { name: p.associated_song.name, artist: p.associated_song.artist }
      : null,
  };
}

function mapProfileToRepoUpdate(p: Partial<ProfileInput>) {
  return {
    profile: {
      fullName: p.full_name,
      relationshipType: p.relationship_type,
      bio: p.bio,
      profession: p.profession,
      longTermGoals: p.long_term_goals,
      birthday: p.birthday ?? null,
      zodiacSign: p.zodiac_sign ?? null,
      musicPreference: p.music_preference,
      favoriteMovie: p.favorite_movie,
      favoriteBook: p.favorite_book,
      favoriteMemory: p.favorite_memory,
      notes: p.notes,
    },
    tags: p.tags?.map((t) => ({ tag: t.tag })),
    politicalViews: p.political_views?.map((v) => ({ view: v.view })),
    foodRestrictions: p.food_restrictions?.map((r) => ({ restriction: r.restriction })),
    movieGenres: p.movie_genres?.map((g) => ({ genre: g.genre })),
    bookGenres: p.book_genres?.map((g) => ({ genre: g.genre })),
    hangoutPlaces: p.hangout_places?.map((hp) => ({ place: hp.place })),
    quotes: p.quotes?.map((q) => ({ quote: q.quote })),
    topSongs: (p.top_songs as TopSongInput[] | undefined)?.map((s) => ({ name: s.name, artist: s.artist })),
    associatedSong: p.associated_song
      ? { name: p.associated_song.name, artist: p.associated_song.artist }
      : null,
  };
}
