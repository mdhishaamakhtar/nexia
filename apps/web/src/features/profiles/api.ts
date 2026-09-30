import type {
  ProfileListResponse,
  ProfileOutput,
  ProfilePayload,
  RelationshipType,
} from "@nexia/shared";
import { api } from "@/shared/api/client";

export interface ListProfilesParams {
  page: number;
  limit: number;
  search?: string;
  relationship_type?: RelationshipType;
}

export function listProfiles(params: ListProfilesParams) {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.search) searchParams.set("search", params.search);
  if (params.relationship_type) searchParams.set("relationship_type", params.relationship_type);
  return api.get("profiles", { searchParams }).json<ProfileListResponse>();
}

export function getProfile(id: string | number) {
  return api.get(`profiles/${id}`).json<ProfileOutput>();
}

export function createProfile(payload: ProfilePayload) {
  return api.post("profiles", { json: payload }).json<{ id: number }>();
}

/** PUT replaces the profile and answers with the stored result. */
export function updateProfile(id: string | number, payload: ProfilePayload) {
  return api.put(`profiles/${id}`, { json: payload }).json<ProfileOutput>();
}

export async function deleteProfile(id: string | number) {
  await api.delete(`profiles/${id}`);
}
