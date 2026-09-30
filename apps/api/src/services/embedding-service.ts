import type { ProfileOutput } from "@nexia/shared";
import type { Logger } from "../logging/logger";

export interface EmbeddingGenerator {
  generateEmbedding(text: string): Promise<number[]>;
}

export interface EmbeddingStore {
  findStale(
    limit: number,
    skipIds: number[]
  ): Promise<Array<{ profile: ProfileOutput; revision: number }>>;
  upsert(entry: {
    profileId: number;
    userId: number;
    embedding: number[];
    revision: number;
  }): Promise<void>;
  search(
    userId: number,
    queryEmbedding: number[],
    limit: number
  ): Promise<Array<{ profileId: number; score: number }>>;
}

const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 60 * 60 * 1000;

/**
 * Keeps each profile's vector in step with the profile, and runs semantic
 * search over them.
 *
 * There is no job queue: a profile is stale when its stored vector's revision
 * is behind the profile's, so the work to do is always one query away and a
 * lost wake-up or a restart can only delay it, never drop it.
 */
export class EmbeddingService {
  /** Profiles that failed recently, and when they may be tried again. */
  private backoff = new Map<number, { failures: number; retryAt: number }>();

  constructor(
    private store: EmbeddingStore,
    private generator: EmbeddingGenerator,
    private logger: Logger
  ) {}

  /** Embeds up to `limit` stale profiles. Returns how many succeeded. */
  async embedStale(limit: number): Promise<number> {
    const now = Date.now();
    for (const [id, b] of this.backoff) {
      // Long past its retry time and never retried: the profile is gone.
      if (b.retryAt < now - RETRY_MAX_MS) this.backoff.delete(id);
    }
    const waiting = [...this.backoff].filter(([, b]) => b.retryAt > now).map(([id]) => id);
    const stale = await this.store.findStale(limit, waiting);

    let embedded = 0;
    for (const { profile, revision } of stale) {
      try {
        const embedding = await this.generator.generateEmbedding(buildEmbeddingText(profile));
        await this.store.upsert({
          profileId: profile.id,
          userId: profile.user_id,
          embedding,
          revision,
        });
        this.backoff.delete(profile.id);
        embedded += 1;
      } catch (err) {
        const failures = (this.backoff.get(profile.id)?.failures ?? 0) + 1;
        const delay = Math.min(RETRY_BASE_MS * 2 ** (failures - 1), RETRY_MAX_MS);
        this.backoff.set(profile.id, { failures, retryAt: Date.now() + delay });
        this.logger.warn(
          { profileId: profile.id, failures, retryInMs: delay, err },
          "embedding failed"
        );
      }
    }
    return embedded;
  }

  /** The user's profiles closest to `query`, best first. */
  async search(userId: number, query: string, limit: number) {
    const embedding = await this.generator.generateEmbedding(query);
    return this.store.search(userId, embedding, limit);
  }
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Formats "YYYY-MM-DD" as "Month D, YYYY" without going through a time zone. */
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${MONTHS[(month ?? 1) - 1]} ${day}, ${year}`;
}

/**
 * Flattens a profile into the labelled text block fed to the embedding model.
 * Empty fields are left out entirely: a run of "Bio: " lines with nothing after
 * them only adds noise shared by every sparse profile.
 */
export function buildEmbeddingText(p: ProfileOutput): string {
  const lines = [`Profile of ${p.full_name}`, `Relationship: ${p.relationship_type}`];
  const add = (label: string, value: string | null | undefined) => {
    if (value?.trim()) lines.push(`${label}: ${value.trim()}`);
  };
  const addList = (label: string, values: string[], sep = ", ") => {
    if (values.length) lines.push(`${label}: ${values.join(sep)}`);
  };

  add("Pronouns", p.pronouns);
  add("Bio", p.bio);
  add("Profession", p.profession);
  add("Zodiac sign", p.zodiac_sign);
  if (p.birthday) add("Birthday", formatDate(p.birthday));
  add("Long-term goals", p.long_term_goals);
  add("Music preference", p.music_preference);
  add("Favorite movie", p.favorite_movie);
  add("Favorite book", p.favorite_book);
  add("Notes", p.notes);
  addList("Interests and tags", p.tags);
  addList("Political views", p.political_views);
  addList("Food restrictions", p.food_restrictions);
  addList("Favorite movie genres", p.movie_genres);
  addList("Favorite book genres", p.book_genres);
  addList("Favorite hangout places", p.hangout_places);
  addList(
    "Top songs",
    p.top_songs.map((s) => (s.artist ? `${s.name} by ${s.artist}` : s.name))
  );
  if (p.associated_song) {
    const s = p.associated_song;
    add("Their song", s.artist ? `${s.name} by ${s.artist}` : s.name);
  }
  addList(
    "Quotes",
    p.quotes.map((q) => `"${q}"`)
  );
  addList("Favorite memories", p.favorite_memories, "; ");

  return lines.join("\n");
}
