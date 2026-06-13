import type { ProfileOutput } from "@nexia/shared";
import type { Logger } from "../logging/logger";
import { errNotFound, errAIUnavailable } from "./errors";

export interface EmbeddingGenerator {
  generateEmbedding(text: string): Promise<number[]>;
}

export interface EmbeddingStorage {
  upsertProfile(
    profileId: number,
    userId: number,
    embedding: number[],
    payload: Record<string, unknown>
  ): Promise<void>;
  deleteProfile(profileId: number): Promise<void>;
}

export interface ProfileLoader {
  loadForEmbedding(profileId: number): Promise<ProfileOutput | null>;
}

export class EmbeddingService {
  constructor(
    private profiles: ProfileLoader,
    private generator: EmbeddingGenerator,
    private repo: EmbeddingStorage,
    private logger: Logger
  ) {}

  async embedProfile(profileId: number): Promise<void> {
    const profile = await this.profiles.loadForEmbedding(profileId);
    if (!profile) {
      throw errNotFound();
    }

    const text = buildEmbeddingText(profile);

    let embedding: number[];
    try {
      embedding = await this.generator.generateEmbedding(text);
    } catch (err) {
      this.logger.error({ profileId, err: String(err) }, "embedding generation failed");
      throw errAIUnavailable(
        `gemini embedding failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    try {
      await this.repo.upsertProfile(profile.id, profile.user_id, embedding, profile);
    } catch (err) {
      this.logger.error({ profileId, err: String(err) }, "embedding upsert failed");
      throw errAIUnavailable(
        `pgvector upsert failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    this.logger.info({ profileId, userId: profile.user_id }, "profile embedded");
  }

  async deleteEmbedding(profileId: number): Promise<void> {
    await this.repo.deleteProfile(profileId);
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

/** Formats "YYYY-MM-DD" as "Month DD, YYYY" to match the Go embedding text. */
function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const month = MONTHS[d.getUTCMonth()];
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${month} ${day}, ${d.getUTCFullYear()}`;
}

/** Flattens a profile into the labelled text block fed to the embedding model. */
export function buildEmbeddingText(p: ProfileOutput): string {
  const lines: string[] = [];
  lines.push(`Profile of ${p.full_name}`);
  lines.push(`Bio: ${p.bio}`);
  lines.push(`Profession: ${p.profession}`);
  lines.push(`Relationship Type: ${p.relationship_type}`);
  if (p.zodiac_sign) lines.push(`Zodiac Sign: ${p.zodiac_sign}`);
  if (p.birthday) lines.push(`Birthday: ${formatDate(p.birthday)}`);
  lines.push(`Long Term Goals: ${p.long_term_goals}`);
  lines.push(`Music Preference: ${p.music_preference}`);
  lines.push(`Favorite Movie: ${p.favorite_movie}`);
  lines.push(`Favorite Book: ${p.favorite_book}`);
  lines.push(`Favorite Memory: ${p.favorite_memory}`);
  lines.push(`Notes: ${p.notes}`);

  if (p.tags.length) lines.push(`Interests/Tags: ${p.tags.map((t) => t.tag).join(", ")}`);
  if (p.political_views.length) {
    lines.push(`Political Views: ${p.political_views.map((v) => v.view).join(", ")}`);
  }
  if (p.food_restrictions.length) {
    lines.push(`Food Restrictions: ${p.food_restrictions.map((r) => r.restriction).join(", ")}`);
  }
  if (p.movie_genres.length) {
    lines.push(`Favorite Movie Genres: ${p.movie_genres.map((g) => g.genre).join(", ")}`);
  }
  if (p.book_genres.length) {
    lines.push(`Favorite Book Genres: ${p.book_genres.map((g) => g.genre).join(", ")}`);
  }
  if (p.hangout_places.length) {
    lines.push(`Favorite Hangout Places: ${p.hangout_places.map((h) => h.place).join(", ")}`);
  }
  if (p.top_songs.length) {
    lines.push(`Top Songs: ${p.top_songs.map((s) => `${s.name} by ${s.artist}`).join(", ")}`);
  }
  if (p.associated_song) {
    lines.push(`Associated Song: ${p.associated_song.name} by ${p.associated_song.artist}`);
  }
  if (p.quotes.length) {
    lines.push(`Quotes: ${p.quotes.map((q) => `"${q.quote}"`).join(", ")}`);
  }

  return lines.join("\n");
}
