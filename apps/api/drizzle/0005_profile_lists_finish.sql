ALTER TABLE "associated_songs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "book_genres" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "favorite_memories" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "food_restrictions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "hangout_places" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "movie_genres" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "political_views" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quotes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "top_songs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "associated_songs" CASCADE;--> statement-breakpoint
DROP TABLE "book_genres" CASCADE;--> statement-breakpoint
DROP TABLE "favorite_memories" CASCADE;--> statement-breakpoint
DROP TABLE "food_restrictions" CASCADE;--> statement-breakpoint
DROP TABLE "hangout_places" CASCADE;--> statement-breakpoint
DROP TABLE "movie_genres" CASCADE;--> statement-breakpoint
DROP TABLE "political_views" CASCADE;--> statement-breakpoint
DROP TABLE "quotes" CASCADE;--> statement-breakpoint
DROP TABLE "tags" CASCADE;--> statement-breakpoint
DROP TABLE "top_songs" CASCADE;--> statement-breakpoint
DROP INDEX "idx_email_verification_tokens_token";--> statement-breakpoint
DROP INDEX "idx_password_reset_tokens_token";--> statement-breakpoint
DROP INDEX "idx_profiles_user_id";--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "pronouns" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "pronouns" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "bio" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "bio" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "profession" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "profession" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "long_term_goals" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "long_term_goals" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "music_preference" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "music_preference" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "favorite_movie" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "favorite_movie" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "favorite_book" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "favorite_book" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profile_embeddings" DROP COLUMN "payload";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "zodiac_sign";