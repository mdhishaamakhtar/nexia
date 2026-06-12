import { z } from "zod";
import { profileInputSchema } from "./profile";

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
