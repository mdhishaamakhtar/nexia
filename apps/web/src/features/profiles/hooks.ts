"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { HTTPError } from "ky";
import type { ProfilePayload, RelationshipType } from "@nexia/shared";
import { createProfile, deleteProfile, getProfile, listProfiles, updateProfile } from "./api";

export const PROFILE_PAGE_SIZE = 48;

export const profileKeys = {
  lists: ["profiles"] as const,
  list: (search: string, relationship: RelationshipType | "") =>
    ["profiles", { search, relationship }] as const,
  detail: (id: string | number) => ["profile", String(id)] as const,
};

export function isNotFound(error: unknown): boolean {
  return error instanceof HTTPError && error.response.status === 404;
}

/**
 * The slambook grid, a page at a time. The previous results stay on screen
 * while a new search loads, so typing never flashes the grid to skeletons.
 */
export function useProfileList(search: string, relationship: RelationshipType | "") {
  return useInfiniteQuery({
    queryKey: profileKeys.list(search, relationship),
    queryFn: ({ pageParam }) =>
      listProfiles({
        page: pageParam,
        limit: PROFILE_PAGE_SIZE,
        search: search || undefined,
        relationship_type: relationship || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useProfile(id: string | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(id ?? ""),
    queryFn: () => getProfile(id!),
    enabled: !!id,
    // A missing profile will still be missing on the second try.
    retry: (count, error) => !isNotFound(error) && count < 1,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProfilePayload) => createProfile(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.lists }),
  });
}

export function useUpdateProfile(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProfilePayload) => updateProfile(id, payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.detail(id), profile);
      return queryClient.invalidateQueries({ queryKey: profileKeys.lists });
    },
  });
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProfile(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: profileKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: profileKeys.lists });
    },
  });
}
