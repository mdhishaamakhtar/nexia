import { api } from "@/shared/api/client";
import type { Profile, ProfileFormValues, ProfilesResponse } from "@/shared/types/profile";

export interface ListProfilesParams {
  page?: number;
  limit?: number;
  search?: string;
  relationship_type?: string;
}

export async function listProfiles(params: ListProfilesParams) {
  const searchParams = new URLSearchParams();
  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("limit", String(params.limit ?? 100));
  if (params.search) searchParams.set("search", params.search);
  if (params.relationship_type) searchParams.set("relationship_type", params.relationship_type);

  return api.get("profiles", { searchParams }).json<ProfilesResponse>();
}

export async function getProfile(id: string | number) {
  return api.get(`profiles/${id}`).json<Profile>();
}

export async function createProfile(payload: ProfileFormValues) {
  return api.post("profiles", { json: toProfilePayload(payload) }).json<{ id: number }>();
}

export async function updateProfile(id: string | number, payload: ProfileFormValues) {
  await api.put(`profiles/${id}`, { json: toProfilePayload(payload) });
}

export async function deleteProfile(id: string | number) {
  await api.delete(`profiles/${id}`);
}

function toProfilePayload(values: ProfileFormValues) {
  return {
    full_name: values.full_name,
    relationship_type: values.relationship_type,
    bio: values.bio,
    profession: values.profession,
    long_term_goals: values.long_term_goals,
    birthday: values.birthday || null,
    music_preference: values.music_preference,
    favorite_movie: values.favorite_movie,
    favorite_book: values.favorite_book,
    favorite_memory: values.favorite_memory,
    tags: values.tags.filter((x) => x.tag.trim()),
    top_songs: values.top_songs.filter((x) => x.name.trim() && x.artist.trim()),
    quotes: values.quotes.filter((x) => x.quote.trim()),
    movie_genres: values.movie_genres.filter((x) => x.genre.trim()),
    book_genres: values.book_genres.filter((x) => x.genre.trim()),
    hangout_places: values.hangout_places.filter((x) => x.place.trim()),
    food_restrictions: values.food_restrictions.filter((x) => x.restriction.trim()),
    political_views: values.political_views.filter((x) => x.view.trim()),
    associated_song:
      values.associated_song_name.trim() || values.associated_song_artist.trim()
        ? {
            name: values.associated_song_name,
            artist: values.associated_song_artist,
          }
        : null,
  };
}

export function toProfileFormValues(profile?: Profile): ProfileFormValues {
  return {
    full_name: profile?.full_name ?? "",
    relationship_type: profile?.relationship_type ?? "Friend",
    bio: profile?.bio ?? "",
    profession: profile?.profession ?? "",
    long_term_goals: profile?.long_term_goals ?? "",
    birthday: profile?.birthday ? profile.birthday.split("T")[0] : "",
    music_preference: profile?.music_preference ?? "",
    favorite_movie: profile?.favorite_movie ?? "",
    favorite_book: profile?.favorite_book ?? "",
    favorite_memory: profile?.favorite_memory ?? "",
    notes: profile?.notes ?? "",
    tags: profile?.tags ?? [],
    top_songs: profile?.top_songs ?? [],
    quotes: profile?.quotes ?? [],
    movie_genres: profile?.movie_genres ?? [],
    book_genres: profile?.book_genres ?? [],
    hangout_places: profile?.hangout_places ?? [],
    food_restrictions: profile?.food_restrictions ?? [],
    political_views: profile?.political_views ?? [],
    associated_song_name: profile?.associated_song?.name ?? "",
    associated_song_artist: profile?.associated_song?.artist ?? "",
  };
}
