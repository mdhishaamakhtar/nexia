import type { Logger } from "../logging/logger";
import { ErrorKind, errNotFound } from "./errors";
import type { ProfileRepo } from "./profile-service";

export interface EmbeddingGenerator {
  generateEmbedding(text: string): Promise<number[]>;
}

export interface EmbeddingStorage {
  upsertProfile(profileId: number, userId: number, embedding: number[], payload: Record<string, unknown>): Promise<void>;
  deleteProfile(profileId: number): Promise<void>;
}

export class EmbeddingService {
  constructor(
    private profiles: ProfileRepo,
    private generator: EmbeddingGenerator,
    private repo: EmbeddingStorage,
    private logger: Logger,
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
      throw new Error(`gemini embedding failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      await this.repo.upsertProfile(Number(profile.id), Number(profile.userId), embedding, profile);
    } catch (err) {
      this.logger.error({ profileId, err: String(err) }, "embedding upsert failed");
      throw new Error(`pgvector upsert failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    this.logger.info({ profileId, userId: profile.userId }, "profile embedded");
  }

  async deleteEmbedding(profileId: number): Promise<void> {
    await this.repo.deleteProfile(profileId);
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const month = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  return `${month} ${String(day).padStart(2, "0")}, ${year}`;
}

function buildEmbeddingText(profile: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push(`Profile of ${profile.fullName}`);
  lines.push(`Bio: ${profile.bio ?? ""}`);
  lines.push(`Profession: ${profile.profession ?? ""}`);
  lines.push(`Relationship Type: ${profile.relationshipType ?? ""}`);
  if (profile.zodiacSign) {
    lines.push(`Zodiac Sign: ${profile.zodiacSign}`);
  }
  if (profile.birthday) {
    lines.push(`Birthday: ${formatDate(profile.birthday as string)}`);
  }
  lines.push(`Long Term Goals: ${profile.longTermGoals ?? ""}`);
  lines.push(`Music Preference: ${profile.musicPreference ?? ""}`);
  lines.push(`Favorite Movie: ${profile.favoriteMovie ?? ""}`);
  lines.push(`Favorite Book: ${profile.favoriteBook ?? ""}`);
  lines.push(`Favorite Memory: ${profile.favoriteMemory ?? ""}`);
  lines.push(`Notes: ${profile.notes ?? ""}`);

  const tags = profile.tags as Array<{ tag: string }> | undefined;
  if (tags?.length) {
    lines.push(`Interests/Tags: ${tags.map((t) => t.tag).join(", ")}`);
  }

  const pv = profile.politicalViews as Array<{ view: string }> | undefined;
  if (pv?.length) {
    lines.push(`Political Views: ${pv.map((v) => v.view).join(", ")}`);
  }

  const fr = profile.foodRestrictions as Array<{ restriction: string }> | undefined;
  if (fr?.length) {
    lines.push(`Food Restrictions: ${fr.map((r) => r.restriction).join(", ")}`);
  }

  const mg = profile.movieGenres as Array<{ genre: string }> | undefined;
  if (mg?.length) {
    lines.push(`Favorite Movie Genres: ${mg.map((g) => g.genre).join(", ")}`);
  }

  const bg = profile.bookGenres as Array<{ genre: string }> | undefined;
  if (bg?.length) {
    lines.push(`Favorite Book Genres: ${bg.map((g) => g.genre).join(", ")}`);
  }

  const hp = profile.hangoutPlaces as Array<{ place: string }> | undefined;
  if (hp?.length) {
    lines.push(`Favorite Hangout Places: ${hp.map((p) => p.place).join(", ")}`);
  }

  const ts = profile.topSongs as Array<{ name: string; artist: string }> | undefined;
  if (ts?.length) {
    lines.push(`Top Songs: ${ts.map((s) => `${s.name} by ${s.artist}`).join(", ")}`);
  }

  const as = profile.associatedSong as { name: string; artist: string } | undefined;
  if (as) {
    lines.push(`Associated Song: ${as.name} by ${as.artist}`);
  }

  const quotes = profile.quotes as Array<{ quote: string }> | undefined;
  if (quotes?.length) {
    lines.push(`Quotes: ${quotes.map((q) => `"${q.quote}"`).join(", ")}`);
  }

  return lines.join("\n");
}
