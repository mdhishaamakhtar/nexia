import { tool, type ToolSet } from "ai";
import {
  ragSearchInputSchema,
  searchProfilesInputSchema,
  getProfileInputSchema,
  listProfilesInputSchema,
  createProfileToolInputSchema,
  updateProfileToolInputSchema,
  type ProfileOutput,
  type RagSearchOutput,
  type ToolErrorOutput,
  type ProfileListToolOutput,
  type GetProfileToolOutput,
  type WriteProfileToolOutput,
} from "@nexia/shared";
import type { ProfileService } from "../services/profile-service";
import type { EmbeddingRepository } from "../repositories/embedding";
import type { EmbeddingGenerator } from "./embeddings";

export interface AgentToolDeps {
  userId: number;
  profileService: ProfileService;
  embeddingRepo: EmbeddingRepository | null;
  embeddingGenerator: EmbeddingGenerator | null;
}

/**
 * Builds the Nexia Intel tool set, hard-scoped to the authenticated user. Every
 * tool delegates to the same services the REST API uses, so validation, zodiac
 * derivation, and embedding re-queue all apply identically. Tools return error
 * objects instead of throwing so a single failure never tears down the stream.
 */
export function buildAgentTools(deps: AgentToolDeps): ToolSet {
  const { userId, profileService, embeddingRepo, embeddingGenerator } = deps;

  return {
    ragSearch: tool({
      description:
        'Semantic (vector) search over the user\'s own profiles. Best FIRST choice for fuzzy, open-ended, or interest/personality/vibe questions where no specific person is named (e.g. "who likes horror movies?", "which friend is into climbing?"). Returns the top matches with full profile details and a similarity score.',
      inputSchema: ragSearchInputSchema,
      execute: async ({ query, limit }): Promise<RagSearchOutput | ToolErrorOutput> => {
        if (!embeddingGenerator || !embeddingRepo) {
          return { error: "Semantic search is unavailable. Use searchProfiles instead." };
        }
        const embedding = await embeddingGenerator.generateEmbedding(query);
        const results = await embeddingRepo.searchContext(userId, embedding, limit);
        // The stored payload is a full ProfileOutput snapshot (see EmbeddingService).
        return results.map((r) => ({
          profile_id: r.profileId,
          score: r.score,
          ...(r.payload as ProfileOutput),
        }));
      },
    }),

    searchProfiles: tool({
      description:
        'Find profiles by name substring and/or relationship type. Use for exact-ish lookups when the user names a person or wants a specific group (e.g. "someone called Sam", "my colleagues"). Returns a paginated summary list — call getProfile for the full details of a match.',
      inputSchema: searchProfilesInputSchema,
      execute: ({ search, relationship_type, page, limit }): Promise<ProfileListToolOutput> =>
        profileService.listProfiles(page, limit, search, relationship_type, userId),
    }),

    getProfile: tool({
      description:
        "Fetch one profile with ALL its details by id. Use when you already know the id (from a previous search or list result) and need the complete record — and always before updating a list field, so you can send back the full array.",
      inputSchema: getProfileInputSchema,
      execute: async ({ id }): Promise<GetProfileToolOutput> => {
        const profile = await profileService.getProfile(id, userId);
        return profile ?? { error: "Profile not found." };
      },
    }),

    listProfiles: tool({
      description:
        'Browse or count ALL of the user\'s profiles, paginated, with no filter. Use for "show me everyone" or to page through the whole collection. Returns summaries — call getProfile for full detail of any one.',
      inputSchema: listProfilesInputSchema,
      execute: ({ page, limit }): Promise<ProfileListToolOutput> =>
        profileService.listProfiles(page, limit, undefined, undefined, userId),
    }),

    createProfile: tool({
      description:
        "Create a new profile. Requires full_name and relationship_type. Never set zodiac_sign (it is derived from the birthday). Only call AFTER summarizing the details and getting the user's explicit confirmation.",
      inputSchema: createProfileToolInputSchema,
      execute: async (input): Promise<WriteProfileToolOutput> => {
        const profile = await profileService.createProfile(input, userId);
        return { id: profile.id, full_name: profile.full_name, profile };
      },
    }),

    updateProfile: tool({
      description:
        "Update an existing profile by id. PATCH semantics: send only the fields you are changing. List fields (tags, quotes, top_songs, etc.) are replaced wholesale, so getProfile first and send the complete new array when adding to a list. Only call AFTER summarizing the changes and getting the user's explicit confirmation.",
      inputSchema: updateProfileToolInputSchema,
      execute: async ({ id, profile }): Promise<WriteProfileToolOutput> => {
        const updated = await profileService.updateProfile(id, profile, userId);
        return { id: updated.id, full_name: updated.full_name, profile: updated };
      },
    }),
  };
}
