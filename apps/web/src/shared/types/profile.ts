export type RelationshipType =
  | "Friend"
  | "Family"
  | "Colleague"
  | "Classmate"
  | "Crush"
  | "Ex"
  | "Mentor"
  | "Other";

export interface Tag {
  id?: number;
  profile_id?: number;
  tag: string;
}

export interface PoliticalView {
  id?: number;
  profile_id?: number;
  view: string;
}

export interface FoodRestriction {
  id?: number;
  profile_id?: number;
  restriction: string;
}

export interface MovieGenre {
  id?: number;
  profile_id?: number;
  genre: string;
}

export interface BookGenre {
  id?: number;
  profile_id?: number;
  genre: string;
}

export interface HangoutPlace {
  id?: number;
  profile_id?: number;
  place: string;
}

export interface Quote {
  id?: number;
  profile_id?: number;
  quote: string;
}

export interface TopSong {
  id?: number;
  profile_id?: number;
  name: string;
  artist: string;
}

export interface AssociatedSong {
  profile_id?: number;
  name: string;
  artist: string;
}

export interface Profile {
  id: number;
  user_id: number;
  full_name: string;
  bio: string;
  profession: string;
  long_term_goals: string;
  relationship_type: RelationshipType;
  birthday?: string | null;
  zodiac_sign?: string | null;
  music_preference: string;
  favorite_movie: string;
  favorite_book: string;
  favorite_memory: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
  tags: Tag[];
  political_views: PoliticalView[];
  food_restrictions: FoodRestriction[];
  movie_genres: MovieGenre[];
  book_genres: BookGenre[];
  hangout_places: HangoutPlace[];
  quotes: Quote[];
  top_songs: TopSong[];
  associated_song?: AssociatedSong | null;
}

export interface ProfilesResponse {
  data: Profile[];
  total: number;
  page: number;
  limit: number;
}

export interface ProfileFormValues {
  full_name: string;
  relationship_type: RelationshipType;
  bio: string;
  profession: string;
  long_term_goals: string;
  birthday: string;
  music_preference: string;
  favorite_movie: string;
  favorite_book: string;
  favorite_memory: string;
  notes: string;
  tags: Tag[];
  top_songs: TopSong[];
  quotes: Quote[];
  movie_genres: MovieGenre[];
  book_genres: BookGenre[];
  hangout_places: HangoutPlace[];
  food_restrictions: FoodRestriction[];
  political_views: PoliticalView[];
  associated_song_name: string;
  associated_song_artist: string;
}

export const relationshipOptions: RelationshipType[] = [
  "Friend",
  "Family",
  "Colleague",
  "Classmate",
  "Crush",
  "Ex",
  "Mentor",
  "Other",
];
