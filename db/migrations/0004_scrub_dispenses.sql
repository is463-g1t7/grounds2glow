CREATE TABLE "scrub_dispenses" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"recipe" text NOT NULL,
	CONSTRAINT "scrub_dispenses_recipe_check" CHECK ("scrub_dispenses"."recipe" in ('gentle', 'standard', 'moisturising'))
);
--> statement-breakpoint
CREATE INDEX "scrub_dispenses_at_idx" ON "scrub_dispenses" USING btree ("at" DESC NULLS LAST);