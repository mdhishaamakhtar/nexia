import type { ProfileInput, ProfileOutput, ProfileSummary, RelationshipType } from "@nexia/shared";

export interface ProfileRepo {
  create(userId: number, input: ProfileInput): Promise<ProfileOutput>;
  findById(id: number, userId: number): Promise<ProfileOutput | null>;
  findByIds(ids: number[], userId: number): Promise<ProfileOutput[]>;
  findAll(params: {
    userId: number;
    page: number;
    limit: number;
    search?: string;
    relationshipType?: RelationshipType;
  }): Promise<{ profiles: ProfileSummary[]; total: number }>;
  update(id: number, userId: number, patch: Partial<ProfileInput>): Promise<ProfileOutput>;
  delete(id: number, userId: number): Promise<void>;
}

/** Nudges the embedding worker. Synchronous and infallible by contract. */
export interface EmbeddingScheduler {
  wake(): void;
}

export interface ListProfilesOptions {
  page: number;
  limit: number;
  search?: string;
  relationshipType?: RelationshipType;
}

/**
 * Profiles for one user. Validation lives in the shared schemas, so a value
 * reaching this service is already one the database accepts.
 *
 * A write never waits on the embedding pipeline: the worker finds stale
 * profiles by their revision, and `wake()` only asks it to look sooner.
 */
export class ProfileService {
  constructor(
    private repo: ProfileRepo,
    private embeddings: EmbeddingScheduler | null
  ) {}

  async createProfile(input: ProfileInput, userId: number): Promise<ProfileOutput> {
    const created = await this.repo.create(userId, input);
    this.embeddings?.wake();
    return created;
  }

  getProfile(id: number, userId: number): Promise<ProfileOutput | null> {
    return this.repo.findById(id, userId);
  }

  getProfiles(ids: number[], userId: number): Promise<ProfileOutput[]> {
    return this.repo.findByIds(ids, userId);
  }

  listProfiles(
    options: ListProfilesOptions,
    userId: number
  ): Promise<{ profiles: ProfileSummary[]; total: number }> {
    return this.repo.findAll({ ...options, userId });
  }

  /**
   * PUT semantics: the supplied profile replaces the stored one outright, so any
   * field the caller left out is reset rather than preserved.
   *
   * This is deliberately separate from `updateProfile`, which merges. The REST
   * endpoint validates a complete profile and means "make it look exactly like
   * this", while the chat agent sends only the fields it is changing.
   */
  replaceProfile(id: number, input: ProfileInput, userId: number): Promise<ProfileOutput> {
    return this.updateProfile(id, withOmittedFieldsCleared(input), userId);
  }

  async updateProfile(
    id: number,
    patch: Partial<ProfileInput>,
    userId: number
  ): Promise<ProfileOutput> {
    const updated = await this.repo.update(id, userId, patch);
    this.embeddings?.wake();
    return updated;
  }

  deleteProfile(id: number, userId: number): Promise<void> {
    // The stored vector goes with the row: profile_embeddings cascades.
    return this.repo.delete(id, userId);
  }
}

/**
 * Materialises every optional field so the update sees an explicit value for
 * each one. `undefined` means "leave alone" further down, which is exactly the
 * wrong reading for a replacement.
 */
function withOmittedFieldsCleared(p: ProfileInput): ProfileInput {
  return {
    ...p,
    pronouns: p.pronouns ?? "",
    bio: p.bio ?? "",
    profession: p.profession ?? "",
    long_term_goals: p.long_term_goals ?? "",
    birthday: p.birthday ?? null,
    music_preference: p.music_preference ?? "",
    favorite_movie: p.favorite_movie ?? "",
    favorite_book: p.favorite_book ?? "",
    notes: p.notes ?? "",
    tags: p.tags ?? [],
    political_views: p.political_views ?? [],
    food_restrictions: p.food_restrictions ?? [],
    movie_genres: p.movie_genres ?? [],
    book_genres: p.book_genres ?? [],
    hangout_places: p.hangout_places ?? [],
    quotes: p.quotes ?? [],
    favorite_memories: p.favorite_memories ?? [],
    top_songs: p.top_songs ?? [],
    associated_song: p.associated_song ?? null,
  };
}
