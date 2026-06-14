import type {
  ProfileOutput,
  ProfileSummary,
  ProfileListResponse,
  CreateProfileResponse,
  RelationshipType,
} from "@nexia/shared";

export { RELATIONSHIP_TYPES } from "@nexia/shared";

export type Profile = ProfileOutput;
export type {
  ProfileOutput,
  ProfileSummary,
  ProfileListResponse,
  CreateProfileResponse,
  RelationshipType,
};

export type AssociatedSongForm = {
  associated_song_name: string;
  associated_song_artist: string;
};

// Form-specific types with optional ids (matching the form's Zod schema)
type FormTag = { id?: number; profile_id?: number; tag: string };
type FormPoliticalView = { id?: number; profile_id?: number; view: string };
type FormFoodRestriction = { id?: number; profile_id?: number; restriction: string };
type FormMovieGenre = { id?: number; profile_id?: number; genre: string };
type FormBookGenre = { id?: number; profile_id?: number; genre: string };
type FormHangoutPlace = { id?: number; profile_id?: number; place: string };
type FormQuote = { id?: number; profile_id?: number; quote: string };
type FormFavoriteMemory = { id?: number; profile_id?: number; memory: string };
type FormTopSong = { id?: number; profile_id?: number; name: string; artist: string };

export type ProfileFormValues = {
  full_name: string;
  pronouns: string;
  relationship_type: RelationshipType;
  bio: string;
  profession: string;
  long_term_goals: string;
  birthday: string;
  music_preference: string;
  favorite_movie: string;
  favorite_book: string;
  notes: string;
  tags: Array<FormTag>;
  political_views: Array<FormPoliticalView>;
  food_restrictions: Array<FormFoodRestriction>;
  movie_genres: Array<FormMovieGenre>;
  book_genres: Array<FormBookGenre>;
  hangout_places: Array<FormHangoutPlace>;
  quotes: Array<FormQuote>;
  favorite_memories: Array<FormFavoriteMemory>;
  top_songs: Array<FormTopSong>;
  associated_song_name: string;
  associated_song_artist: string;
};

export const relationshipOptions = [
  { value: "Friend" as const, label: "Friend" },
  { value: "Family" as const, label: "Family" },
  { value: "Colleague" as const, label: "Colleague" },
  { value: "Classmate" as const, label: "Classmate" },
  { value: "Crush" as const, label: "Crush" },
  { value: "Ex" as const, label: "Ex" },
  { value: "Mentor" as const, label: "Mentor" },
  { value: "Other" as const, label: "Other" },
];
