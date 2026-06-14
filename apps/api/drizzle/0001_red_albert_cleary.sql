CREATE TABLE "favorite_memories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"profile_id" bigint NOT NULL,
	"memory" text
);
--> statement-breakpoint
ALTER TABLE "favorite_memories" ADD CONSTRAINT "favorite_memories_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_favorite_memories_profile_id" ON "favorite_memories" USING btree ("profile_id");--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "favorite_memory";