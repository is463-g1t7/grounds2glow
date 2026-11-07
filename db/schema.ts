import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const cleaners = pgTable(
  "cleaners",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    initials: text("initials").notNull(),
    pass: text("pass").notNull().unique(),
    shift: text("shift").notNull(),
    vendor: text("vendor").notNull(),
  },
  (t) => [check("cleaners_shift_check", sql`${t.shift} in ('AM', 'PM')`)]
);

export const bins = pgTable(
  "bins",
  {
    id: text("id").primaryKey(),
    short: text("short").notNull(),
    name: text("name").notNull(),
    pantry: text("pantry").notNull(),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }).notNull().default(sql`0`),
    capacityKg: numeric("capacity_kg", { precision: 6, scale: 2 }).notNull().default(sql`10`),
    levels: integer("levels").notNull().default(4),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("bins_weight_nonnegative", sql`${t.weightKg} >= 0`),
    check("bins_capacity_positive", sql`${t.capacityKg} > 0`),
    check("bins_levels_positive", sql`${t.levels} > 0`),
  ]
);

export const binEvents = pgTable(
  "bin_events",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    binId: text("bin_id")
      .notNull()
      .references(() => bins.id, { onDelete: "cascade" }),
    level: integer("level"),
    pantry: text("pantry"),
    type: text("type").notNull(),
    kg: numeric("kg", { precision: 6, scale: 2 }).notNull(),
    cleanerId: text("cleaner_id").references(() => cleaners.id, { onDelete: "set null" }),
    collectedBy: text("collected_by"),
    source: text("source"),
    beforeKg: numeric("before_kg", { precision: 6, scale: 2 }),
    afterKg: numeric("after_kg", { precision: 6, scale: 2 }),
    photo: text("photo"),
  },
  (t) => [
    index("bin_events_bin_at_idx").on(t.binId, t.at.desc()),
    index("bin_events_at_idx").on(t.at.desc()),
    check("bin_events_type_check", sql`${t.type} in ('deposit', 'collect')`),
    check("bin_events_kg_check", sql`${t.kg} >= 0`),
    check("bin_events_source_check", sql`${t.source} in ('ocr', 'reference', 'manual', 'demo')`),
  ]
);

export const listings = pgTable(
  "listings",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    type: text("type").notNull(),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }).notNull(),
    building: text("building").notNull(),
    donor: text("donor").notNull(),
    pickup: text("pickup").notNull(),
    image: text("image").notNull(),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    note: text("note").notNull().default(""),
    claimed: boolean("claimed").notNull().default(false),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("listings_created_at_idx").on(t.createdAt.desc()),
    check("listings_type_check", sql`${t.type} in ('Espresso', 'Filter', 'Decaf')`),
    check("listings_weight_positive", sql`${t.weightKg} > 0`),
  ]
);

export const claims = pgTable("claims", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  claimant: text("claimant").notNull().default("You"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const newsItems = pgTable("news_items", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  tag: text("tag").notNull(),
  publishedAt: date("published_at").notNull(),
  image: text("image").notNull(),
  href: text("href").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const programmeEvents = pgTable("programme_events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  eventDate: date("event_date").notNull(),
  venue: text("venue").notNull(),
  description: text("description").notNull(),
  image: text("image").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const programmeMetrics = pgTable("programme_metrics", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  label: text("label").notNull(),
  detail: text("detail").notNull(),
  tone: text("tone").notNull().default("gold"),
  sort: integer("sort").notNull().default(0),
});
