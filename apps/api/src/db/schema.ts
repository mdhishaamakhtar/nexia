import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  text,
  boolean,
  date,
  timestamp,
  jsonb,
  vector,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull().default(""),
    emailVerified: boolean("email_verified").notNull().default(false),
    password: varchar("password", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("idx_users_email").on(t.email)]
);

export const profiles = pgTable(
  "profiles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: varchar("full_name", { length: 150 }).notNull(),
    bio: text("bio"),
    profession: varchar("profession", { length: 150 }),
    longTermGoals: text("long_term_goals"),
    relationshipType: varchar("relationship_type", { length: 50 }).notNull(),
    birthday: date("birthday", { mode: "string" }),
    zodiacSign: varchar("zodiac_sign", { length: 50 }),
    musicPreference: text("music_preference"),
    favoriteMovie: varchar("favorite_movie", { length: 200 }),
    favoriteBook: varchar("favorite_book", { length: 200 }),
    favoriteMemory: text("favorite_memory"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_profiles_user_id").on(t.userId),
    index("idx_profiles_user_relationship").on(t.userId, t.relationshipType),
  ]
);

export const tags = pgTable(
  "tags",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    profileId: bigint("profile_id", { mode: "number" })
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tag: varchar("tag", { length: 255 }),
  },
  (t) => [index("idx_tags_profile_id").on(t.profileId)]
);

export const politicalViews = pgTable(
  "political_views",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    profileId: bigint("profile_id", { mode: "number" })
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    view: varchar("view", { length: 255 }),
  },
  (t) => [index("idx_political_views_profile_id").on(t.profileId)]
);

export const foodRestrictions = pgTable(
  "food_restrictions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    profileId: bigint("profile_id", { mode: "number" })
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    restriction: varchar("restriction", { length: 255 }),
  },
  (t) => [index("idx_food_restrictions_profile_id").on(t.profileId)]
);

export const movieGenres = pgTable(
  "movie_genres",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    profileId: bigint("profile_id", { mode: "number" })
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    genre: varchar("genre", { length: 255 }),
  },
  (t) => [index("idx_movie_genres_profile_id").on(t.profileId)]
);

export const bookGenres = pgTable(
  "book_genres",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    profileId: bigint("profile_id", { mode: "number" })
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    genre: varchar("genre", { length: 255 }),
  },
  (t) => [index("idx_book_genres_profile_id").on(t.profileId)]
);

export const hangoutPlaces = pgTable(
  "hangout_places",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    profileId: bigint("profile_id", { mode: "number" })
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    place: varchar("place", { length: 255 }),
  },
  (t) => [index("idx_hangout_places_profile_id").on(t.profileId)]
);

export const quotes = pgTable(
  "quotes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    profileId: bigint("profile_id", { mode: "number" })
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    quote: text("quote"),
  },
  (t) => [index("idx_quotes_profile_id").on(t.profileId)]
);

export const topSongs = pgTable(
  "top_songs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    profileId: bigint("profile_id", { mode: "number" })
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }),
    artist: varchar("artist", { length: 255 }),
  },
  (t) => [index("idx_top_songs_profile_id").on(t.profileId)]
);

export const associatedSongs = pgTable("associated_songs", {
  profileId: bigint("profile_id", { mode: "number" })
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }),
  artist: varchar("artist", { length: 255 }),
});

export const profileEmbeddings = pgTable(
  "profile_embeddings",
  {
    profileId: bigint("profile_id", { mode: "number" })
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    embedding: vector("embedding", { dimensions: 3072 }).notNull(),
    payload: jsonb("payload").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("idx_profile_embeddings_user_id").on(t.userId)]
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    used: boolean("used").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("idx_password_reset_tokens_token").on(t.token)]
);

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: varchar("token", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    used: boolean("used").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_email_verification_tokens_token").on(t.token),
    index("idx_email_verification_tokens_user_id").on(t.userId),
  ]
);
