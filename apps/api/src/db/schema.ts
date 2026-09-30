import { sql } from "drizzle-orm";
import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  text,
  boolean,
  date,
  timestamp,
  integer,
  jsonb,
  vector,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Song } from "@nexia/shared";

export const users = pgTable(
  "users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** Always stored trimmed and lower-cased; see `emailSchema`. */
    email: varchar("email", { length: 255 }).notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    password: varchar("password", { length: 255 }).notNull(),
    /** Tokens issued before this moment are refused. Set by a password reset. */
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("idx_users_email").on(t.email)]
);

const emptyTextArray = sql`'{}'::text[]`;

/**
 * One row per person. The list fields are arrays on the row itself: they are
 * always read with the profile and always replaced as a whole, which is the
 * access pattern of a column, not of a child table.
 *
 * There is no zodiac column. The sign is a pure function of `birthday` and is
 * derived whenever a profile is read (see profile-mapper).
 */
export const profiles = pgTable(
  "profiles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: varchar("full_name", { length: 150 }).notNull(),
    pronouns: varchar("pronouns", { length: 100 }).notNull().default(""),
    relationshipType: varchar("relationship_type", { length: 50 }).notNull(),
    bio: text("bio").notNull().default(""),
    profession: varchar("profession", { length: 150 }).notNull().default(""),
    longTermGoals: text("long_term_goals").notNull().default(""),
    birthday: date("birthday", { mode: "string" }),
    musicPreference: text("music_preference").notNull().default(""),
    favoriteMovie: varchar("favorite_movie", { length: 200 }).notNull().default(""),
    favoriteBook: varchar("favorite_book", { length: 200 }).notNull().default(""),
    notes: text("notes").notNull().default(""),
    tags: text("tags").array().notNull().default(emptyTextArray),
    politicalViews: text("political_views").array().notNull().default(emptyTextArray),
    foodRestrictions: text("food_restrictions").array().notNull().default(emptyTextArray),
    movieGenres: text("movie_genres").array().notNull().default(emptyTextArray),
    bookGenres: text("book_genres").array().notNull().default(emptyTextArray),
    hangoutPlaces: text("hangout_places").array().notNull().default(emptyTextArray),
    quotes: text("quotes").array().notNull().default(emptyTextArray),
    favoriteMemories: text("favorite_memories").array().notNull().default(emptyTextArray),
    topSongs: jsonb("top_songs")
      .$type<Song[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    associatedSong: jsonb("associated_song").$type<Song | null>(),
    /**
     * Incremented on every write. The embedding worker compares it with the
     * revision it last embedded, so a stale vector is found by a query rather
     * than by remembering to enqueue a job.
     */
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("idx_profiles_user_relationship").on(t.userId, t.relationshipType)]
);

export const profileEmbeddings = pgTable(
  "profile_embeddings",
  {
    profileId: bigint("profile_id", { mode: "number" })
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    embedding: vector("embedding", { dimensions: 3072 }).notNull(),
    /** The `profiles.revision` this vector was computed from. */
    sourceRevision: integer("source_revision"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("idx_profile_embeddings_user_id").on(t.userId)]
);

/** Password reset links. `token` holds the SHA-256 of the emailed token. */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

/** Email verification links. `token` holds the SHA-256 of the emailed token. */
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
  (t) => [index("idx_email_verification_tokens_user_id").on(t.userId)]
);
