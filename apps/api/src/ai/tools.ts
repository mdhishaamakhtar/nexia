import { tool, type ToolSet } from "ai";
import {
  ragSearchInputSchema,
  searchProfilesInputSchema,
  getProfileInputSchema,
  listProfilesInputSchema,
  createProfileToolInputSchema,
  updateProfileToolInputSchema,
  type RagSearchOutput,
  type ToolErrorOutput,
  type ProfileListToolOutput,
  type GetProfileToolOutput,
  type WriteProfileToolOutput,
} from "@nexia/shared";
import type { ProfileService } from "../services/profile-service";
import type { EmbeddingService } from "../services/embedding-service";

export interface AgentToolDeps {
  userId: number;
  profileService: ProfileService;
  embeddingService: EmbeddingService | null;
}

/**
 * Builds the chat assistant's tool set, hard-scoped to the authenticated user. Every
 * tool delegates to the same services the REST API uses, so validation and
 * embedding refresh apply identically.
 *
 * The two write tools need the person's approval: the model proposes the
 * change, the chat UI shows it with Save and Cancel, and the tool only runs
 * once they say yes. The prompt asks the model to confirm first, but this is
 * the guarantee.
 */
export function buildAgentTools(deps: AgentToolDeps): ToolSet {
  const { userId, profileService, embeddingService } = deps;

  return {
    ragSearch: tool({
      description:
        'Semantic (vector) search over the user\'s own profiles. Best FIRST choice for fuzzy, open-ended, or interest/personality/vibe questions where no specific person is named (e.g. "who likes horror movies?", "which friend is into climbing?"). Returns the top matches with full profile details and a similarity score.',
      inputSchema: ragSearchInputSchema,
      execute: async ({ query, limit }): Promise<RagSearchOutput | ToolErrorOutput> => {
        if (!embeddingService) {
          return { error: "Semantic search is unavailable. Use searchProfiles instead." };
        }
        const hits = await embeddingService.search(userId, query, limit);
        const scores = new Map(hits.map((h) => [h.profileId, h.score]));
        // Answers come from the live profile, never from a copy taken when the
        // profile was last embedded.
        const profiles = await profileService.getProfiles(
          hits.map((h) => h.profileId),
          userId
        );
        // Every profile returned was asked for by id, so it has a score.
        return profiles.map((p) => ({ ...p, score: scores.get(p.id)! }));
      },
    }),

    searchProfiles: tool({
      description:
        'Find profiles by name substring and/or relationship type. Use for exact-ish lookups when the user names a person or wants a specific group (e.g. "someone called Sam", "my colleagues"). Returns a paginated summary list — call getProfile for the full details of a match.',
      inputSchema: searchProfilesInputSchema,
      execute: ({ search, relationship_type, page, limit }): Promise<ProfileListToolOutput> =>
        profileService.listProfiles(
          { page, limit, search, relationshipType: relationship_type },
          userId
        ),
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
        'Browse or count ALL of the user\'s profiles, alphabetically and paginated, with no filter. Use for "show me everyone" or to page through the whole collection. Returns summaries — call getProfile for full detail of any one.',
      inputSchema: listProfilesInputSchema,
      execute: ({ page, limit }): Promise<ProfileListToolOutput> =>
        profileService.listProfiles({ page, limit }, userId),
    }),

    createProfile: tool({
      description:
        "Create a new profile. Requires full_name and relationship_type. The user is shown the details and must approve before anything is saved.",
      inputSchema: createProfileToolInputSchema,
      needsApproval: true,
      execute: async (input): Promise<WriteProfileToolOutput> => {
        const profile = await profileService.createProfile(input, userId);
        return { id: profile.id, full_name: profile.full_name, profile };
      },
    }),

    updateProfile: tool({
      description:
        "Update an existing profile by id. PATCH semantics: send only the fields you are changing. List fields (tags, quotes, top_songs, etc.) are replaced wholesale, so getProfile first and send the complete new array when adding to a list. The user is shown the change and must approve before it is saved.",
      inputSchema: updateProfileToolInputSchema,
      needsApproval: true,
      execute: async ({ id, profile }): Promise<WriteProfileToolOutput> => {
        const updated = await profileService.updateProfile(id, profile, userId);
        return { id: updated.id, full_name: updated.full_name, profile: updated };
      },
    }),
  };
}
