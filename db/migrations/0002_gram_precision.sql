ALTER TABLE "bin_events" ALTER COLUMN "kg" SET DATA TYPE numeric(7, 3);--> statement-breakpoint
ALTER TABLE "bin_events" ALTER COLUMN "before_kg" SET DATA TYPE numeric(7, 3);--> statement-breakpoint
ALTER TABLE "bin_events" ALTER COLUMN "after_kg" SET DATA TYPE numeric(7, 3);--> statement-breakpoint
ALTER TABLE "bins" ALTER COLUMN "weight_kg" SET DATA TYPE numeric(7, 3);--> statement-breakpoint
ALTER TABLE "bins" ALTER COLUMN "weight_kg" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "bins" ALTER COLUMN "capacity_kg" SET DATA TYPE numeric(7, 3);--> statement-breakpoint
ALTER TABLE "bins" ALTER COLUMN "capacity_kg" SET DEFAULT 2;