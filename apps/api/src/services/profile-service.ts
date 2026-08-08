import type { Logger } from "../logging/logger";
import type { ProfileInput, ProfileOutput, ProfileSummary } from "@nexia/shared";
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
  favoriteMemories?: Array<{ memory: string }>;
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
  }): Promise<{ profiles: ProfileSummary[]; total: number }>;
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
  ): Promise<{ profiles: ProfileSummary[]; total: number }> {
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 100) limit = 100;
    return this.repo.findAll({ page, limit, search, relationshipType, userId });
  }

  /**
   * PUT semantics: the supplied profile replaces the stored one outright, so any
   * field the caller left out is reset rather than preserved.
   *
   * This is deliberately separate from `updateProfile`, which merges. The two
   * callers want genuinely different things — the REST endpoint validates a
   * complete profile and means "make it look exactly like this", while the chat
   * agent sends only the fields it is changing — and serving both from one
   * merging method is what made PUT quietly ignore omitted fields.
   */
  async replaceProfile(id: number, profile: ProfileInput, userId: number): Promise<ProfileOutput> {
    return this.updateProfile(id, withOmittedFieldsCleared(profile), userId);
  }

  async updateProfile(
    id: number,
    profile: Partial<ProfileInput>,
    userId: number
  ): Promise<ProfileOutput> {
    if ((profile.top_songs?.length ?? 0) > MAX_TOP_SONGS) {
      throw errValidation("cannot have more than 3 top songs");
    }

    // Only (re)derive the zodiac when the caller actually supplied a birthday.
    // applyDerivedZodiac can't tell "field omitted" from "explicitly null", so
    // on a partial update without birthday we must leave the existing zodiac be.
    if ("birthday" in profile) {
      applyDerivedZodiac(profile);
    }

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

/**
 * Materialises every optional field so the update path sees an explicit value
 * for each one. `undefined` means "leave alone" further down the stack, which is
 * exactly the wrong reading for a replacement.
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

function mapProfileToRepoInput(p: ProfileInput, userId: number) {
  return {
    profile: {
      userId,
      fullName: p.full_name,
      pronouns: p.pronouns ?? "",
      relationshipType: p.relationship_type,
      bio: p.bio ?? "",
      profession: p.profession ?? "",
      longTermGoals: p.long_term_goals ?? "",
      birthday: p.birthday ?? null,
      zodiacSign: p.zodiac_sign ?? null,
      musicPreference: p.music_preference ?? "",
      favoriteMovie: p.favorite_movie ?? "",
      favoriteBook: p.favorite_book ?? "",
      notes: p.notes ?? "",
    },
    ...mapChildren(p),
  };
}

function mapProfileToRepoUpdate(p: Partial<ProfileInput>) {
  // PATCH semantics: every scalar is a straight passthrough — when a field is
  // omitted it stays `undefined`, and Drizzle's `.set()` skips undefined keys,
  // leaving the stored value untouched. birthday/zodiac are special: a missing
  // birthday must NOT clear the existing one, so we only include them when the
  // caller actually sent a birthday (see updateProfile above).
  const profile: Record<string, unknown> = {
    fullName: p.full_name,
    pronouns: p.pronouns,
    relationshipType: p.relationship_type,
    bio: p.bio,
    profession: p.profession,
    longTermGoals: p.long_term_goals,
    musicPreference: p.music_preference,
    favoriteMovie: p.favorite_movie,
    favoriteBook: p.favorite_book,
    notes: p.notes,
  };
  if ("birthday" in p) {
    profile.birthday = p.birthday ?? null;
    profile.zodiacSign = p.zodiac_sign ?? null;
  }
  return {
    profile,
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
    favoriteMemories: p.favorite_memories?.map((m) => ({ memory: m.memory })),
    topSongs: p.top_songs?.map((s) => ({ name: s.name, artist: s.artist })),
    associatedSong: p.associated_song
      ? { name: p.associated_song.name, artist: p.associated_song.artist }
      : p.associated_song === null
        ? null
        : undefined,
  };
}
