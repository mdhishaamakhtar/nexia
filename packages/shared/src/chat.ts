import { z } from "zod";
import { profileInputSchema, profileOutputSchema } from "./profile";

export const CHAT_TOOL_NAMES = [
  "ragSearch",
  "searchProfiles",
  "getProfile",
  "listProfiles",
  "createProfile",
  "updateProfile",
] as const;

export type ChatToolName = (typeof CHAT_TOOL_NAMES)[number];

export const ragSearchInputSchema = z.object({
  query: z.string(),
  limit: z.number().max(10).optional().default(5),
});

export const searchProfilesInputSchema = z.object({
  search: z.string().optional(),
  relationship_type: z.string().optional(),
  page: z.number().optional().default(1),
  limit: z.number().max(100).optional().default(10),
});

export const getProfileInputSchema = z.object({
  id: z.number(),
});

export const listProfilesInputSchema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().max(100).optional().default(10),
});

export const createProfileToolInputSchema = profileInputSchema;

export const updateProfileToolInputSchema = z.object({
  id: z.number(),
  profile: profileInputSchema,
});

export type RagSearchInput = z.infer<typeof ragSearchInputSchema>;
export type SearchProfilesInput = z.infer<typeof searchProfilesInputSchema>;
export type GetProfileInput = z.infer<typeof getProfileInputSchema>;
export type ListProfilesInput = z.infer<typeof listProfilesInputSchema>;
export type CreateProfileToolInput = z.infer<typeof createProfileToolInputSchema>;
export type UpdateProfileToolInput = z.infer<typeof updateProfileToolInputSchema>;

// ── Tool output contract ───────────────────────────────────────────────
// The shapes every chat tool returns. The backend builds these and the chat
// UI parses tool-part output against them, so both ends share one contract
// instead of the frontend guessing at field names.

/** Soft failure shape a tool returns instead of throwing (e.g. unavailable). */
export const toolErrorOutputSchema = z.object({ error: z.string() });

/** One `ragSearch` hit: a full profile snapshot plus its match metadata. */
export const ragSearchResultSchema = profileOutputSchema.extend({
  profile_id: z.number(),
  score: z.number(),
});
export const ragSearchOutputSchema = z.array(ragSearchResultSchema);

/** `searchProfiles` and `listProfiles` both return a page of full profiles. */
export const profileListToolOutputSchema = z.object({
  profiles: z.array(profileOutputSchema),
  total: z.number(),
});

/** `getProfile` returns one full profile, or a soft error when not found. */
export const getProfileToolOutputSchema = z.union([profileOutputSchema, toolErrorOutputSchema]);

/** `createProfile` / `updateProfile` echo the saved profile plus its id/name. */
export const writeProfileToolOutputSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  profile: profileOutputSchema,
});

export type ToolErrorOutput = z.infer<typeof toolErrorOutputSchema>;
export type RagSearchResult = z.infer<typeof ragSearchResultSchema>;
export type RagSearchOutput = z.infer<typeof ragSearchOutputSchema>;
export type ProfileListToolOutput = z.infer<typeof profileListToolOutputSchema>;
export type GetProfileToolOutput = z.infer<typeof getProfileToolOutputSchema>;
export type WriteProfileToolOutput = z.infer<typeof writeProfileToolOutputSchema>;
