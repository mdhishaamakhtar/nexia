import { z } from "zod";
import { relationshipTypeSchema } from "./enums";
import { profileInputSchema, profileOutputSchema, profileSummarySchema } from "./profile";

export const CHAT_TOOL_NAMES = [
  "ragSearch",
  "searchProfiles",
  "getProfile",
  "listProfiles",
  "createProfile",
  "updateProfile",
] as const;

export type ChatToolName = (typeof CHAT_TOOL_NAMES)[number];

/** Tools that write. The chat UI asks the person to approve each call first. */
export const WRITE_TOOL_NAMES = [
  "createProfile",
  "updateProfile",
] as const satisfies readonly ChatToolName[];

/**
 * The most messages of history the server will look at. Older turns are
 * dropped rather than rejected, so a long conversation keeps working.
 */
export const CHAT_HISTORY_LIMIT = 40;

export const ragSearchInputSchema = z.object({
  query: z.string().trim().min(1).max(500),
  limit: z.number().int().min(1).max(10).optional().default(5),
});

export const searchProfilesInputSchema = z.object({
  search: z.string().trim().max(150).optional(),
  relationship_type: relationshipTypeSchema.optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

export const getProfileInputSchema = z.object({
  id: z.number().int().positive(),
});

export const listProfilesInputSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(10),
});

export const createProfileToolInputSchema = profileInputSchema;

// Updates are PATCH-style: the agent sends only the fields it wants to change.
// `.partial()` makes every profile field optional so the model never has to
// restate `full_name`/`relationship_type` just to edit one detail.
export const updateProfileToolInputSchema = z.object({
  id: z.number().int().positive(),
  profile: profileInputSchema.partial(),
});

// ── Tool output contract ───────────────────────────────────────────────
// The shapes every chat tool returns. The backend builds these and the chat
// UI parses tool-part output against them, so both ends share one contract
// instead of the frontend guessing at field names.

/** Soft failure shape a tool returns instead of throwing (e.g. unavailable). */
export const toolErrorOutputSchema = z.object({ error: z.string() });

/** One `ragSearch` hit: the live profile plus how closely it matched. */
export const ragSearchResultSchema = profileOutputSchema.extend({
  score: z.number(),
});
export const ragSearchOutputSchema = z.array(ragSearchResultSchema);

/**
 * `searchProfiles` and `listProfiles` return a page of lean profile summaries —
 * enough for the agent to identify a person and for the chat UI to render result
 * cards. The agent calls `getProfile` / `ragSearch` when it needs full details.
 */
export const profileListToolOutputSchema = z.object({
  profiles: z.array(profileSummarySchema),
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
export type RagSearchOutput = z.infer<typeof ragSearchOutputSchema>;
export type ProfileListToolOutput = z.infer<typeof profileListToolOutputSchema>;
export type GetProfileToolOutput = z.infer<typeof getProfileToolOutputSchema>;
export type WriteProfileToolOutput = z.infer<typeof writeProfileToolOutputSchema>;
