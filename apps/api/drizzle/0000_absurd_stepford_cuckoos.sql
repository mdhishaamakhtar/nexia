CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "associated_songs" (
	"profile_id" bigint PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"artist" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "book_genres" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"profile_id" bigint NOT NULL,
	"genre" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"token" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "food_restrictions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"profile_id" bigint NOT NULL,
	"restriction" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "hangout_places" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"profile_id" bigint NOT NULL,
	"place" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "movie_genres" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"profile_id" bigint NOT NULL,
	"genre" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"token" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "political_views" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"profile_id" bigint NOT NULL,
	"view" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "profile_embeddings" (
	"profile_id" bigint PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"embedding" vector(3072) NOT NULL,
	"payload" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"full_name" varchar(150) NOT NULL,
	"bio" text,
	"profession" varchar(150),
	"long_term_goals" text,
	"relationship_type" varchar(50) NOT NULL,
	"birthday" date,
	"zodiac_sign" varchar(50),
	"music_preference" text,
	"favorite_movie" varchar(200),
	"favorite_book" varchar(200),
	"favorite_memory" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"profile_id" bigint NOT NULL,
	"quote" text
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"profile_id" bigint NOT NULL,
	"tag" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "top_songs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"profile_id" bigint NOT NULL,
	"name" varchar(255),
	"artist" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" varchar(255) DEFAULT '' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "associated_songs" ADD CONSTRAINT "associated_songs_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_genres" ADD CONSTRAINT "book_genres_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_restrictions" ADD CONSTRAINT "food_restrictions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hangout_places" ADD CONSTRAINT "hangout_places_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "political_views" ADD CONSTRAINT "political_views_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_embeddings" ADD CONSTRAINT "profile_embeddings_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "top_songs" ADD CONSTRAINT "top_songs_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_book_genres_profile_id" ON "book_genres" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_email_verification_tokens_token" ON "email_verification_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_email_verification_tokens_user_id" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_food_restrictions_profile_id" ON "food_restrictions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_hangout_places_profile_id" ON "hangout_places" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_movie_genres_profile_id" ON "movie_genres" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_token" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_political_views_profile_id" ON "political_views" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_profile_embeddings_user_id" ON "profile_embeddings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_profiles_user_id" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_profiles_user_relationship" ON "profiles" USING btree ("user_id","relationship_type");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_relationship_type_check" CHECK (relationship_type IN ('Friend','Family','Colleague','Classmate','Crush','Ex','Mentor','Other'));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_zodiac_sign_check" CHECK (zodiac_sign IN ('Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'));--> statement-breakpoint
CREATE INDEX "idx_profiles_user_full_name_lower" ON "profiles" USING btree ("user_id", LOWER("full_name"));--> statement-breakpoint
CREATE INDEX "idx_quotes_profile_id" ON "quotes" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_tags_profile_id" ON "tags" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_top_songs_profile_id" ON "top_songs" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email");