import { sql } from "drizzle-orm";
import {
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
    weightKg: numeric("weight_kg", { precision: 7, scale: 3 }).notNull().default(sql`0`),
    capacityKg: numeric("capacity_kg", { precision: 7, scale: 3 }).notNull().default(sql`2`),
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
    kg: numeric("kg", { precision: 7, scale: 3 }).notNull(),
    cleanerId: text("cleaner_id").references(() => cleaners.id, { onDelete: "set null" }),
    collectedBy: text("collected_by"),
    source: text("source"),
    beforeKg: numeric("before_kg", { precision: 7, scale: 3 }),
    afterKg: numeric("after_kg", { precision: 7, scale: 3 }),
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
