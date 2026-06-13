import type { Logger } from "../logging/logger";
import type { ProfileInput, ProfileOutput } from "@nexia/shared";
import { errValidation } from "./errors";
import { applyDerivedZodiac } from "./zodiac";

/** Child collections in the DB-facing (value-only) shape repositories expect. */
interface ProfileChildInput {
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

export interface ProfileRepo {
  create(input: ProfileChildInput & { profile: Record<string, unknown> }): Promise<ProfileOutput>;
  findById(id: number, userId: number): Promise<ProfileOutput | null>;
  findAll(params: {
    page: number;
    limit: number;
    search?: string;
    relationshipType?: string;
    userId: number;
  }): Promise<{ profiles: ProfileOutput[]; total: number }>;
  update(
    profileId: number,
    userId: number,
    input: ProfileChildInput & { profile: Record<string, unknown> }
  ): Promise<ProfileOutput>;
  loadForEmbedding(profileId: number): Promise<ProfileOutput | null>;
  delete(id: number, userId: number): Promise<void>;
}

export interface EmbeddingQueue {
  enqueueEmbeddingTask(profileId: number): Promise<void>;
  enqueueDeletionTask(profileId: number): Promise<void>;
}

const MAX_TOP_SONGS = 3;

export class ProfileService {
  constructor(
    private repo: ProfileRepo,
    private queue: EmbeddingQueue | null,
    private logger: Logger
  ) {}

  async createProfile(profile: ProfileInput, userId: number): Promise<ProfileOutput> {
    if ((profile.top_songs?.length ?? 0) > MAX_TOP_SONGS) {
      throw errValidation("cannot have more than 3 top songs");
    }

    applyDerivedZodiac(profile);

    const created = await this.repo.create(mapProfileToRepoInput(profile, userId));
    await this.enqueueEmbedding(created.id);
    return created;
  }

  async getProfile(id: number, userId: number): Promise<ProfileOutput | null> {
    return this.repo.findById(id, userId);
  }

  async listProfiles(
    page: number,
    limit: number,
    search: string | undefined,
    relationshipType: string | undefined,
    userId: number
  ): Promise<{ profiles: ProfileOutput[]; total: number }> {
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100;
    return this.repo.findAll({ page, limit, search, relationshipType, userId });
  }

  async updateProfile(
    id: number,
    profile: Partial<ProfileInput>,
    userId: number
  ): Promise<ProfileOutput> {
    if ((profile.top_songs?.length ?? 0) > MAX_TOP_SONGS) {
      throw errValidation("cannot have more than 3 top songs");
    }

    applyDerivedZodiac(profile);

    const updated = await this.repo.update(id, userId, mapProfileToRepoUpdate(profile));
    await this.enqueueEmbedding(id);
    return updated;
  }

  async deleteProfile(id: number, userId: number): Promise<void> {
    await this.repo.delete(id, userId);

    if (!this.queue) return;
    try {
      await this.queue.enqueueDeletionTask(id);
    } catch (err) {
      this.logger.warn(
        { profileId: id, err: String(err) },
        "failed to enqueue profile deletion task"
      );
    }
  }

  /** Enqueues an embedding refresh; failures are logged, never thrown. */
  private async enqueueEmbedding(profileId: number): Promise<void> {
    if (!this.queue) return;
    try {
      await this.queue.enqueueEmbeddingTask(profileId);
    } catch (err) {
      this.logger.warn({ profileId, err: String(err) }, "failed to enqueue profile embedding task");
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
    ...mapChildren(p),
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
    ...mapChildren(p),
  };
}

/** Maps the contract's child arrays into the value-only DB child shape. */
function mapChildren(p: Partial<ProfileInput>) {
  return {
    tags: p.tags?.map((t) => ({ tag: t.tag })),
    politicalViews: p.political_views?.map((v) => ({ view: v.view })),
    foodRestrictions: p.food_restrictions?.map((r) => ({ restriction: r.restriction })),
    movieGenres: p.movie_genres?.map((g) => ({ genre: g.genre })),
    bookGenres: p.book_genres?.map((g) => ({ genre: g.genre })),
    hangoutPlaces: p.hangout_places?.map((hp) => ({ place: hp.place })),
    quotes: p.quotes?.map((q) => ({ quote: q.quote })),
    topSongs: p.top_songs?.map((s) => ({ name: s.name, artist: s.artist })),
    associatedSong: p.associated_song
      ? { name: p.associated_song.name, artist: p.associated_song.artist }
      : p.associated_song === null
        ? null
        : undefined,
  };
}
