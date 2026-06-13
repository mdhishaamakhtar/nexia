import { tool, type ToolSet } from "ai";
import {
  ragSearchInputSchema,
  searchProfilesInputSchema,
  getProfileInputSchema,
  listProfilesInputSchema,
  createProfileToolInputSchema,
  updateProfileToolInputSchema,
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
      description: "Semantically search the user's profiles using AI embeddings (RAG).",
      inputSchema: ragSearchInputSchema,
      execute: async ({ query, limit }) => {
        if (!embeddingGenerator || !embeddingRepo) {
          return { error: "Semantic search is unavailable. Use searchProfiles instead." };
        }
        const embedding = await embeddingGenerator.generateEmbedding(query);
        const results = await embeddingRepo.searchContext(userId, embedding, limit);
        return results.map((r) => ({ profile_id: r.profileId, score: r.score, ...r.payload }));
      },
    }),

    searchProfiles: tool({
      description: "Search the user's profiles by name substring and/or relationship type.",
      inputSchema: searchProfilesInputSchema,
      execute: async ({ search, relationship_type, page, limit }) =>
        profileService.listProfiles(page, limit, search, relationship_type, userId),
    }),

    getProfile: tool({
      description: "Fetch a single profile (with all details) by its ID.",
      inputSchema: getProfileInputSchema,
      execute: async ({ id }) => {
        const profile = await profileService.getProfile(id, userId);
        return profile ?? { error: "Profile not found." };
      },
    }),

    listProfiles: tool({
      description: "List the user's profiles with pagination.",
      inputSchema: listProfilesInputSchema,
      execute: async ({ page, limit }) =>
        profileService.listProfiles(page, limit, undefined, undefined, userId),
    }),

    createProfile: tool({
      description:
        "Create a new profile. Only call after summarizing the details and getting the user's explicit confirmation.",
      inputSchema: createProfileToolInputSchema,
      execute: async (input) => {
        const profile = await profileService.createProfile(input, userId);
        return { id: profile.id, full_name: profile.full_name, profile };
      },
    }),

    updateProfile: tool({
      description:
        "Update an existing profile by ID. Only call after summarizing the changes and getting the user's explicit confirmation.",
      inputSchema: updateProfileToolInputSchema,
      execute: async ({ id, profile }) => {
        const updated = await profileService.updateProfile(id, profile, userId);
        return { id: updated.id, full_name: updated.full_name, profile: updated };
      },
    }),
  };
}
