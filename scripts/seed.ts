import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { pathToFileURL } from "node:url";
import * as schema from "../db/schema";
import type { BinEvent, Cleaner } from "../lib/types";

/**
 * Single source of truth for all demo data. The application never imports these
 * arrays directly — it queries Postgres, and this script seeds that database.
 */

const HOUR = 3_600_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

const bins = [
  { id: "bin-soa", short: "SOA", name: "School of Accountancy", pantry: "SOA Lobby · L1", weightKg: 3.1, capacityKg: 10, levels: 5 },
  { id: "bin-lkcsb", short: "LKCSB", name: "Lee Kong Chian School of Business", pantry: "LKCSB Lobby · L1", weightKg: 8.6, capacityKg: 10, levels: 4 },
  { id: "bin-soe", short: "SOE", name: "School of Economics", pantry: "SOE Lobby · L1", weightKg: 10, capacityKg: 10, levels: 4 },
  { id: "bin-scis", short: "SCIS", name: "School of Computing and Information Systems", pantry: "SCIS Lobby · L1", weightKg: 1.2, capacityKg: 10, levels: 5 },
  { id: "bin-yphsl", short: "YPHSL", name: "Yong Pung How School of Law", pantry: "YPHSL Lobby · L1", weightKg: 3.6, capacityKg: 10, levels: 6 },
  { id: "bin-soss", short: "SOSS", name: "School of Social Sciences", pantry: "SOSS Lobby · L1", weightKg: 6.4, capacityKg: 10, levels: 4 },
  { id: "bin-lib", short: "LKS", name: "Li Ka Shing Library", pantry: "LKS Lobby · L1", weightKg: 2.2, capacityKg: 10, levels: 5 },
];

const cleaners: Cleaner[] = [
  { id: "c-0142", name: "Siti Rahmah", initials: "SR", pass: "SMU-CLN-0142", shift: "AM", vendor: "Campus FM · Zone A" },
  { id: "c-0217", name: "Ramesh Pillai", initials: "RP", pass: "SMU-CLN-0217", shift: "AM", vendor: "Campus FM · Zone B" },
  { id: "c-0388", name: "Tan Mei Ling", initials: "TM", pass: "SMU-CLN-0388", shift: "PM", vendor: "Campus FM · Zone A" },
  { id: "c-0451", name: "Ahmad Faizal", initials: "AF", pass: "SMU-CLN-0451", shift: "PM", vendor: "Campus FM · Zone C" },
];

function buildEvents(): BinEvent[] {
  const now = Date.now();
  const hoursAgo = (h: number) => new Date(now - h * HOUR).toISOString();

  function dep(
    id: string,
    hours: number,
    binId: string,
    short: string,
    level: number,
    cleanerId: string,
    beforeKg: number,
    afterKg: number,
    source: BinEvent["source"] = "ocr"
  ): BinEvent {
    return {
      id,
      at: hoursAgo(hours),
      binId,
      level,
      pantry: `${short} · L${level}`,
      type: "deposit",
      kg: round2(afterKg - beforeKg),
      cleanerId,
      source,
      beforeKg,
      afterKg,
    };
  }

  function collect(
    id: string,
    hours: number,
    binId: string,
    kg: number,
    cleanerId: string
  ): BinEvent {
    return {
      id,
      at: hoursAgo(hours),
      binId,
      type: "collect",
      kg,
      cleanerId,
      beforeKg: kg,
      afterKg: 0,
    };
  }

  // Each bin's history starts at zero and ends at its seeded weight, and every
  // collection empties exactly what the preceding deposits put in.
  return [
    dep("seed-1", 8.0, "bin-soa", "SOA", 2, "c-0388", 0, 2.3),
    collect("seed-2", 7.5, "bin-soa", 2.3, "c-0388"),
    dep("seed-3", 1.1, "bin-soa", "SOA", 4, "c-0388", 0, 3.1, "manual"),
    dep("seed-4", 6.0, "bin-lkcsb", "LKCSB", 2, "c-0142", 0, 7.0),
    collect("seed-5", 5.5, "bin-lkcsb", 7.0, "c-0142"),
    dep("seed-6", 0.9, "bin-lkcsb", "LKCSB", 2, "c-0142", 0, 8.6),
    dep("seed-7", 0.7, "bin-soe", "SOE", 3, "c-0217", 0, 10.0),
    dep("seed-8", 5.0, "bin-scis", "SCIS", 2, "c-0451", 0, 0.7),
    collect("seed-9", 4.5, "bin-scis", 0.7, "c-0451"),
    dep("seed-10", 0.4, "bin-scis", "SCIS", 3, "c-0217", 0, 1.2),
    dep("seed-11", 0.3, "bin-yphsl", "YPHSL", 5, "c-0388", 0, 3.6),
    dep("seed-12", 0.2, "bin-soss", "SOSS", 1, "c-0451", 0, 6.4),
    dep("seed-13", 0.1, "bin-lib", "LKS", 4, "c-0142", 0, 2.2),
  ];
}

const listings = [
  { id: "G-1042", title: "Rich espresso grounds", type: "Espresso", weightKg: 8.4, building: "Administration Building", donor: "OCIS Pantry Team", pickup: "Today · 14:00–17:00", image: "/images/coffee-grounds.jpg", tags: ["Available now", "High nitrogen"], note: "Collected this morning. Stored in the pantry bin with a sealed lid.", claimed: false },
  { id: "G-1041", title: "Fresh filter grounds", type: "Filter", weightKg: 6.1, building: "School of Computing", donor: "SCIS Pantry Team", pickup: "Tomorrow · 09:00–12:00", image: "/images/coffee-beans.jpg", tags: ["Available now", "Compost-ready"], note: "Light roast. Ideal for worm bins and young seedlings.", claimed: false },
  { id: "G-1039", title: "Espresso blend grounds", type: "Espresso", weightKg: 4.8, building: "Lee Kong Chian School of Business", donor: "LKCSB Pantry Team", pickup: "Today · 16:00–18:00", image: "/images/cafe.jpg", tags: ["Pickup today"], note: "Two sealed 2.4 kg tubs. Lift access from the loading bay.", claimed: false },
  { id: "G-1037", title: "Decaf grounds", type: "Decaf", weightKg: 3.2, building: "School of Accountancy", donor: "SOA Pantry Team", pickup: "Thu · 10:00–13:00", image: "/images/coffee-cup.jpg", tags: ["Low acidity"], note: "Small batch from the Level 2 pantry. Great for indoor plants.", claimed: false },
  { id: "G-1036", title: "Dark roast grounds", type: "Espresso", weightKg: 7.6, building: "School of Economics", donor: "SOE Pantry Team", pickup: "Today · 15:00–18:00", image: "/images/coffee-pour.jpg", tags: ["Available now", "Bulk"], note: "Best matched with the SOSS garden project this week.", claimed: false },
  { id: "G-1034", title: "Light roast grounds", type: "Filter", weightKg: 5.4, building: "School of Social Sciences", donor: "SOSS Pantry Team", pickup: "Fri · 09:00–12:00", image: "/images/plants.jpg", tags: ["Reserved"], note: "Reserved for the SOSS community garden. Backup requests welcome.", claimed: true },
  { id: "G-1032", title: "Espresso grounds", type: "Espresso", weightKg: 2.9, building: "Yong Pung How School of Law", donor: "SOL Pantry Team", pickup: "Today · 12:00–15:00", image: "/images/garden.jpg", tags: ["Available now"], note: "One 2.9 kg tub. Please bring your own container.", claimed: false },
  { id: "G-1030", title: "House blend grounds", type: "Filter", weightKg: 1.8, building: "College of Integrative Studies", donor: "CIS Pantry Team", pickup: "Tomorrow · 08:00–11:00", image: "/images/coffee-machine.jpg", tags: ["New"], note: "First collection from the CIS pantry. Small but mighty.", claimed: false },
];

const news = [
  { id: "news-1", title: "33 pantries now log every drop-off in real time", tag: "Programme update", publishedAt: "2026-10-28", image: "/images/coffee-machine.jpg", href: "/dashboard" },
  { id: "news-2", title: "The SOSS garden trial: 180 kg of grounds, one growing season", tag: "Impact story", publishedAt: "2026-10-21", image: "/images/garden.jpg", href: "/dashboard" },
  { id: "news-3", title: "Meet the grounds crew keeping the loop turning", tag: "Community", publishedAt: "2026-10-14", image: "/images/programme-intro.jpg", href: "/#about" },
  { id: "news-4", title: "What we learned from our first AI matching pilot", tag: "Innovation", publishedAt: "2026-10-07", image: "/images/research-digital.webp", href: "/assistant" },
];

const programmeEvents = [
  { id: "event-1", title: "Grounds 101: Brewing a circular campus", eventDate: "2026-11-12", venue: "Administration Building, Level 2", description: "A 45-minute walkthrough of the programme, the smart bins and the people behind the loop.", image: "/images/cafe.jpg" },
  { id: "event-2", title: "Community garden drop-in", eventDate: "2026-11-19", venue: "SOSS Garden", description: "Pick up a free bag of grounds, meet the gardeners and learn how to compost at home.", image: "/images/garden.jpg" },
  { id: "event-3", title: "Circular Coffee Hackathon", eventDate: "2026-11-28", venue: "School of Computing", description: "Students and staff prototype new uses for spent grounds in a one-day sprint.", image: "/images/research-asia.webp" },
];

const metrics = [
  { key: "collected", value: "1,284 kg", label: "Collected since launch", detail: "Programme to date", tone: "gold" },
  { key: "co2", value: "412 kg", label: "CO₂e avoided since launch", detail: "Programme to date", tone: "navy" },
  { key: "diverted", value: "86%", label: "Diverted from incineration", detail: "Target 80%", tone: "success" },
  { key: "pantries", value: "33 / 33", label: "Active pantries", detail: "All reporting", tone: "navy" },
];

type Database = NodePgDatabase<typeof schema>;

export async function seedDatabase(db: Database): Promise<void> {
  const events = buildEvents();
  const now = Date.now();
  const at = (hours: number) => new Date(now - hours * HOUR);
  const latestByBin = new Map<string, string>();
  for (const e of events) {
    const previous = latestByBin.get(e.binId);
    if (!previous || e.at > previous) latestByBin.set(e.binId, e.at);
  }

  await db.transaction(async (tx) => {
    await tx.execute(
      sql`TRUNCATE claims, bin_events, listings, news_items, programme_events, programme_metrics, bins, cleaners RESTART IDENTITY CASCADE`
    );

    await tx.insert(schema.cleaners).values(cleaners);
    await tx.insert(schema.bins).values(
      bins.map((b) => ({
        id: b.id,
        short: b.short,
        name: b.name,
        pantry: b.pantry,
        weightKg: String(b.weightKg),
        capacityKg: String(b.capacityKg),
        levels: b.levels,
        updatedAt: new Date(latestByBin.get(b.id) ?? at(0).toISOString()),
      }))
    );
    await tx.insert(schema.binEvents).values(
      events.map((e) => ({
        id: e.id,
        at: new Date(e.at),
        binId: e.binId,
        level: e.level ?? null,
        pantry: e.pantry ?? null,
        type: e.type,
        kg: String(e.kg),
        cleanerId: e.cleanerId ?? null,
        source: e.source ?? null,
        beforeKg: e.beforeKg == null ? null : String(e.beforeKg),
        afterKg: e.afterKg == null ? null : String(e.afterKg),
      }))
    );
    await tx.insert(schema.listings).values(
      listings.map((l) => ({
        id: l.id,
        title: l.title,
        type: l.type,
        weightKg: String(l.weightKg),
        building: l.building,
        donor: l.donor,
        pickup: l.pickup,
        image: l.image,
        tags: l.tags,
        note: l.note,
        claimed: l.claimed,
        claimedAt: l.claimed ? at(4) : null,
        createdAt: at(1),
      }))
    );
    const claimed = listings.filter((l) => l.claimed);
    if (claimed.length) {
      await tx.insert(schema.claims).values(
        claimed.map((l) => ({ listingId: l.id, claimant: "SOSS community garden" }))
      );
    }
    await tx.insert(schema.newsItems).values(
      news.map((n, sort) => ({ ...n, sort }))
    );
    await tx.insert(schema.programmeEvents).values(
      programmeEvents.map((e, sort) => ({ ...e, sort }))
    );
    await tx.insert(schema.programmeMetrics).values(
      metrics.map((m, sort) => ({ ...m, sort }))
    );
  });

  console.log(`seeded ${bins.length} bins, ${events.length} events, ${listings.length} listings`);
}

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL is required.");
  const needsSsl =
    process.env.DATABASE_SSL === "true" ||
    /supabase\.(com|co)|pooler\.supabase|sslmode=require/i.test(connectionString);
  const pool = new Pool({
    connectionString,
    max: 2,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
  const db = drizzle(pool, { schema });
  try {
    await seedDatabase(db);
    console.log("seed complete");
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
