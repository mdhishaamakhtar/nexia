import { tool } from "ai";
import { z } from "zod";
import type { ProfileService } from "../services/profile-service";
import type { EmbeddingRepository } from "../repositories/embedding";
import type { EmbeddingGenerator } from "./embeddings";

export function buildAgentTools(params: {
  userId: number;
  profileService: ProfileService;
  embeddingRepo: EmbeddingRepository | null;
  embeddingGenerator: EmbeddingGenerator | null;
}) {
  const { userId, profileService, embeddingRepo, embeddingGenerator } = params;

  return {
    ragSearch: tool({
      description: "Semantically search profile data using AI embeddings",
      parameters: z.object({
        query: z.string().describe("The search query"),
        limit: z.number().max(10).optional().default(5),
      }),
      execute: async ({ query, limit }) => {
        if (!embeddingGenerator || !embeddingRepo) {
          return { error: "semantic search unavailable" };
        }
        const embedding = await embeddingGenerator.generateEmbedding(query);
        const results = await embeddingRepo.searchContext(userId, embedding, limit);
        return results.map((r) => ({
          profile_id: r.profileId,
          score: r.score,
          ...r.payload,
        }));
      },
    }),

    searchProfiles: tool({
      description: "Search profiles by name or relationship type",
      parameters: z.object({
        search: z.string().optional(),
        relationship_type: z.string().optional(),
        page: z.number().optional().default(1),
        limit: z.number().max(100).optional().default(10),
      }),
      execute: async ({ search, relationship_type, page, limit }) => {
        const result = await profileService.listProfiles(page, limit, search, relationship_type, userId);
        return result;
      },
    }),

    getProfile: tool({
      description: "Get a single profile by ID",
      parameters: z.object({
        id: z.number(),
      }),
      execute: async ({ id }) => {
        const profile = await profileService.getProfile(id, userId);
        if (!profile) return { error: "Profile not found" };
        return profile;
      },
    }),

    listProfiles: tool({
      description: "List profiles with pagination",
      parameters: z.object({
        page: z.number().optional().default(1),
        limit: z.number().max(100).optional().default(10),
      }),
      execute: async ({ page, limit }) => {
        return profileService.listProfiles(page, limit, undefined, undefined, userId);
      },
    }),

    createProfile: tool({
      description: "Create a new profile for someone in your network",
      parameters: z.object({
        full_name: z.string().min(1).max(150),
        relationship_type: z.enum(["Friend", "Family", "Colleague", "Classmate", "Crush", "Ex", "Mentor", "Other"]),
        birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        bio: z.string().optional(),
        profession: z.string().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
      execute: async (input) => {
        const profile = {
          full_name: input.full_name,
          relationship_type: input.relationship_type,
          birthday: input.birthday,
          bio: input.bio,
          profession: input.profession,
          notes: input.notes,
          tags: (input.tags ?? []).map((t) => ({ tag: t })),
        };
        const created = await profileService.createProfile(profile, userId);
        return created;
      },
    }),

    updateProfile: tool({
      description: "Update an existing profile",
      parameters: z.object({
        id: z.number(),
        full_name: z.string().min(1).max(150).optional(),
        relationship_type: z.enum(["Friend", "Family", "Colleague", "Classmate", "Crush", "Ex", "Mentor", "Other"]).optional(),
        birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        bio: z.string().optional(),
        profession: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async ({ id, ...rest }) => {
        const updated = await profileService.updateProfile(id, rest, userId);
        return updated;
      },
    }),
  };
}
