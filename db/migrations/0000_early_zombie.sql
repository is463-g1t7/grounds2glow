CREATE TABLE "bin_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"bin_id" text NOT NULL,
	"level" integer,
	"pantry" text,
	"type" text NOT NULL,
	"kg" numeric(6, 2) NOT NULL,
	"cleaner_id" text,
	"source" text,
	"before_kg" numeric(6, 2),
	"after_kg" numeric(6, 2),
	"photo" text,
	CONSTRAINT "bin_events_type_check" CHECK ("bin_events"."type" in ('deposit', 'collect')),
	CONSTRAINT "bin_events_kg_check" CHECK ("bin_events"."kg" >= 0),
	CONSTRAINT "bin_events_source_check" CHECK ("bin_events"."source" in ('ocr', 'reference', 'manual', 'demo'))
);
--> statement-breakpoint
CREATE TABLE "bins" (
	"id" text PRIMARY KEY NOT NULL,
	"short" text NOT NULL,
	"name" text NOT NULL,
	"pantry" text NOT NULL,
	"weight_kg" numeric(6, 2) DEFAULT 0 NOT NULL,
	"capacity_kg" numeric(6, 2) DEFAULT 10 NOT NULL,
	"levels" integer DEFAULT 4 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bins_weight_nonnegative" CHECK ("bins"."weight_kg" >= 0),
	CONSTRAINT "bins_capacity_positive" CHECK ("bins"."capacity_kg" > 0),
	CONSTRAINT "bins_levels_positive" CHECK ("bins"."levels" > 0)
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"listing_id" text NOT NULL,
	"claimant" text DEFAULT 'You' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cleaners" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"pass" text NOT NULL,
	"shift" text NOT NULL,
	"vendor" text NOT NULL,
	CONSTRAINT "cleaners_pass_unique" UNIQUE("pass"),
	CONSTRAINT "cleaners_shift_check" CHECK ("cleaners"."shift" in ('AM', 'PM'))
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"weight_kg" numeric(6, 2) NOT NULL,
	"building" text NOT NULL,
	"donor" text NOT NULL,
	"pickup" text NOT NULL,
	"image" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"claimed" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_type_check" CHECK ("listings"."type" in ('Espresso', 'Filter', 'Decaf')),
	CONSTRAINT "listings_weight_positive" CHECK ("listings"."weight_kg" > 0)
);
--> statement-breakpoint
CREATE TABLE "news_items" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"tag" text NOT NULL,
	"published_at" date NOT NULL,
	"image" text NOT NULL,
	"href" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programme_events" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"event_date" date NOT NULL,
	"venue" text NOT NULL,
	"description" text NOT NULL,
	"image" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programme_metrics" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"detail" text NOT NULL,
	"tone" text DEFAULT 'gold' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bin_events" ADD CONSTRAINT "bin_events_bin_id_bins_id_fk" FOREIGN KEY ("bin_id") REFERENCES "public"."bins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bin_events" ADD CONSTRAINT "bin_events_cleaner_id_cleaners_id_fk" FOREIGN KEY ("cleaner_id") REFERENCES "public"."cleaners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bin_events_bin_at_idx" ON "bin_events" USING btree ("bin_id","at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "bin_events_at_idx" ON "bin_events" USING btree ("at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "listings_created_at_idx" ON "listings" USING btree ("created_at" DESC NULLS LAST);