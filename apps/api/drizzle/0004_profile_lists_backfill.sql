-- Copies the nine one-row-per-item child tables onto the profile row itself, as
-- the ordered arrays added by 0003. Items keep the order they were entered in
-- (their id order), blank items are dropped, and every value is trimmed. The
-- child tables are dropped by the next migration, once this has run.

UPDATE "profiles" p SET "tags" = s.items
FROM (
  SELECT "profile_id", array_agg(btrim("tag") ORDER BY "id") AS items
  FROM "tags" WHERE coalesce(btrim("tag"), '') <> '' GROUP BY "profile_id"
) s WHERE s."profile_id" = p."id";
--> statement-breakpoint
UPDATE "profiles" p SET "political_views" = s.items
FROM (
  SELECT "profile_id", array_agg(btrim("view") ORDER BY "id") AS items
  FROM "political_views" WHERE coalesce(btrim("view"), '') <> '' GROUP BY "profile_id"
) s WHERE s."profile_id" = p."id";
--> statement-breakpoint
UPDATE "profiles" p SET "food_restrictions" = s.items
FROM (
  SELECT "profile_id", array_agg(btrim("restriction") ORDER BY "id") AS items
  FROM "food_restrictions" WHERE coalesce(btrim("restriction"), '') <> '' GROUP BY "profile_id"
) s WHERE s."profile_id" = p."id";
--> statement-breakpoint
UPDATE "profiles" p SET "movie_genres" = s.items
FROM (
  SELECT "profile_id", array_agg(btrim("genre") ORDER BY "id") AS items
  FROM "movie_genres" WHERE coalesce(btrim("genre"), '') <> '' GROUP BY "profile_id"
) s WHERE s."profile_id" = p."id";
--> statement-breakpoint
UPDATE "profiles" p SET "book_genres" = s.items
FROM (
  SELECT "profile_id", array_agg(btrim("genre") ORDER BY "id") AS items
  FROM "book_genres" WHERE coalesce(btrim("genre"), '') <> '' GROUP BY "profile_id"
) s WHERE s."profile_id" = p."id";
--> statement-breakpoint
UPDATE "profiles" p SET "hangout_places" = s.items
FROM (
  SELECT "profile_id", array_agg(btrim("place") ORDER BY "id") AS items
  FROM "hangout_places" WHERE coalesce(btrim("place"), '') <> '' GROUP BY "profile_id"
) s WHERE s."profile_id" = p."id";
--> statement-breakpoint
UPDATE "profiles" p SET "quotes" = s.items
FROM (
  SELECT "profile_id", array_agg(btrim("quote") ORDER BY "id") AS items
  FROM "quotes" WHERE coalesce(btrim("quote"), '') <> '' GROUP BY "profile_id"
) s WHERE s."profile_id" = p."id";
--> statement-breakpoint
UPDATE "profiles" p SET "favorite_memories" = s.items
FROM (
  SELECT "profile_id", array_agg(btrim("memory") ORDER BY "id") AS items
  FROM "favorite_memories" WHERE coalesce(btrim("memory"), '') <> '' GROUP BY "profile_id"
) s WHERE s."profile_id" = p."id";
--> statement-breakpoint
-- A song is now required to have a name. Old rows that only had an artist keep
-- that text as the name rather than being lost.
UPDATE "profiles" p SET "top_songs" = s.items
FROM (
  SELECT "profile_id", jsonb_agg(
    jsonb_build_object(
      'name', coalesce(nullif(btrim("name"), ''), btrim("artist")),
      'artist', CASE WHEN nullif(btrim("name"), '') IS NULL THEN '' ELSE coalesce(btrim("artist"), '') END
    ) ORDER BY "id"
  ) AS items
  FROM "top_songs"
  WHERE coalesce(btrim("name"), '') <> '' OR coalesce(btrim("artist"), '') <> ''
  GROUP BY "profile_id"
) s WHERE s."profile_id" = p."id";
--> statement-breakpoint
UPDATE "profiles" p SET "associated_song" = jsonb_build_object(
  'name', coalesce(nullif(btrim(a."name"), ''), btrim(a."artist")),
  'artist', CASE WHEN nullif(btrim(a."name"), '') IS NULL THEN '' ELSE coalesce(btrim(a."artist"), '') END
)
FROM "associated_songs" a
WHERE a."profile_id" = p."id"
  AND (coalesce(btrim(a."name"), '') <> '' OR coalesce(btrim(a."artist"), '') <> '');
--> statement-breakpoint
-- Empty text is stored as '' from here on; the next migration makes these
-- columns NOT NULL, which needs every NULL gone first.
UPDATE "profiles" SET
  "pronouns" = coalesce("pronouns", ''),
  "bio" = coalesce("bio", ''),
  "profession" = coalesce("profession", ''),
  "long_term_goals" = coalesce("long_term_goals", ''),
  "music_preference" = coalesce("music_preference", ''),
  "favorite_movie" = coalesce("favorite_movie", ''),
  "favorite_book" = coalesce("favorite_book", '')
WHERE "pronouns" IS NULL OR "bio" IS NULL OR "profession" IS NULL OR "long_term_goals" IS NULL
   OR "music_preference" IS NULL OR "favorite_movie" IS NULL OR "favorite_book" IS NULL;
--> statement-breakpoint
-- Addresses are compared lower-cased from now on. Lower-case the stored ones,
-- except where that would collide with another account's address: those are
-- left alone rather than failing the migration.
UPDATE "users" u SET "email" = lower(btrim(u."email"))
WHERE u."email" <> lower(btrim(u."email"))
  AND NOT EXISTS (
    SELECT 1 FROM "users" o
    WHERE o."id" <> u."id" AND lower(btrim(o."email")) = lower(btrim(u."email"))
  );
--> statement-breakpoint
-- Tokens are now stored as SHA-256 hashes, so no stored plain-text token could
-- match again. Clear them; anyone mid-flow can request a fresh link.
DELETE FROM "password_reset_tokens";
--> statement-breakpoint
DELETE FROM "email_verification_tokens";
