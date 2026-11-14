import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { pathToFileURL } from "node:url";
import * as schema from "../db/schema";
import { COLLECTOR_LABEL } from "../lib/bins";
import type { BinEvent, Cleaner } from "../lib/types";

/**
 * Single source of truth for all demo data. The application never imports these
 * arrays directly — it queries Postgres, and this script seeds that database.
 */

const HOUR = 3_600_000;
const roundG = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Bins are sized to the prototype: a small container on a kitchen scale, 2 kg when full.
 * LKS is the physical prototype bin, so it starts empty and real readings build up from there.
 */
const bins = [
  { id: "bin-soa", short: "SOA", name: "School of Accountancy", pantry: "SOA Lobby · L1", weightKg: 0.62, capacityKg: 2, levels: 5 },
  { id: "bin-lkcsb", short: "LKCSB", name: "Lee Kong Chian School of Business", pantry: "LKCSB Lobby · L1", weightKg: 1.72, capacityKg: 2, levels: 4 },
  { id: "bin-soe", short: "SOE", name: "School of Economics", pantry: "SOE Lobby · L1", weightKg: 2, capacityKg: 2, levels: 4 },
  { id: "bin-scis", short: "SCIS", name: "School of Computing and Information Systems", pantry: "SCIS Lobby · L1", weightKg: 0.24, capacityKg: 2, levels: 5 },
  { id: "bin-yphsl", short: "YPHSL", name: "Yong Pung How School of Law", pantry: "YPHSL Lobby · L1", weightKg: 0.72, capacityKg: 2, levels: 6 },
  { id: "bin-soss", short: "SOSS", name: "School of Social Sciences", pantry: "SOSS Lobby · L1", weightKg: 1.28, capacityKg: 2, levels: 4 },
  { id: "bin-lib", short: "LKS", name: "Li Ka Shing Library", pantry: "LKS Lobby · L1", weightKg: 0, capacityKg: 2, levels: 5 },
];

const cleaners: Cleaner[] = [
  { id: "c-0142", name: "Siti Rahmah", initials: "SR", pass: "SMU-CLN-0142", shift: "AM", vendor: "Campus FM · Zone A" },
  { id: "c-0217", name: "Ramesh Pillai", initials: "RP", pass: "SMU-CLN-0217", shift: "AM", vendor: "Campus FM · Zone B" },
  { id: "c-0388", name: "Tan Mei Ling", initials: "TM", pass: "SMU-CLN-0388", shift: "PM", vendor: "Campus FM · Zone A" },
  { id: "c-0451", name: "Ahmad Faizal", initials: "AF", pass: "SMU-CLN-0451", shift: "PM", vendor: "Campus FM · Zone C" },
];

/** How each building's pantries behave: fill rate, which levels drink the most, who empties them. */
const profiles: Record<string, { kgPerDay: number; levelWeights: number[]; am: string; pm: string }> = {
  "bin-soa": { kgPerDay: 0.24, levelWeights: [1, 3, 1.5, 2, 0.5], am: "c-0142", pm: "c-0388" },
  "bin-lkcsb": { kgPerDay: 0.32, levelWeights: [1, 3.5, 2, 1], am: "c-0142", pm: "c-0388" },
  "bin-soe": { kgPerDay: 0.36, levelWeights: [1, 1.5, 4, 1.5], am: "c-0217", pm: "c-0451" },
  "bin-scis": { kgPerDay: 0.16, levelWeights: [0.5, 2, 3, 1, 1], am: "c-0217", pm: "c-0451" },
  // L6 is a quiet pantry on purpose, so the level chart has a gap to show.
  "bin-yphsl": { kgPerDay: 0.2, levelWeights: [1, 1, 1.5, 0.5, 3, 0], am: "c-0217", pm: "c-0388" },
  "bin-soss": { kgPerDay: 0.22, levelWeights: [3, 1, 1, 0.5], am: "c-0142", pm: "c-0451" },
  "bin-lib": { kgPerDay: 0.18, levelWeights: [1, 1.5, 1, 3, 0.5], am: "c-0217", pm: "c-0388" },
};

const HISTORY_DAYS = 30;
const OPEN_HOUR = 8;
const CLOSE_HOUR = 20;
const WORK_HOURS_PER_DAY = CLOSE_HOUR - OPEN_HOUR;
const AVG_CADDY_KG = 0.13;

/** Small deterministic PRNG so every reset produces the same history. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hashOf = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

/** The moment `hours` working hours (08:00–20:00) before `now`, skipping nights. */
function workingHoursBefore(now: number, hours: number): number {
  const d = new Date(now);
  let cursor = now;
  if (d.getHours() >= CLOSE_HOUR) cursor = d.setHours(CLOSE_HOUR, 0, 0, 0);
  else if (d.getHours() < OPEN_HOUR) {
    d.setDate(d.getDate() - 1);
    cursor = d.setHours(CLOSE_HOUR, 0, 0, 0);
  }
  let remaining = hours;
  for (;;) {
    const open = new Date(cursor);
    open.setHours(OPEN_HOUR, 0, 0, 0);
    const available = (cursor - open.getTime()) / HOUR;
    if (remaining <= available) return cursor - remaining * HOUR;
    remaining -= available;
    open.setDate(open.getDate() - 1);
    cursor = open.setHours(CLOSE_HOUR, 0, 0, 0);
  }
}

/** Splits `total` kg into caddy-sized drops that add up exactly. */
function splitKg(total: number, rand: () => number): number[] {
  const n = Math.max(1, Math.round(total / AVG_CADDY_KG));
  const weights = Array.from({ length: n }, () => 0.5 + rand());
  const sum = weights.reduce((s, w) => s + w, 0);
  const parts = weights.map((w) => roundG((total * w) / sum));
  parts[n - 1] = roundG(total - parts.slice(0, -1).reduce((s, p) => s + p, 0));
  return parts;
}

function pickLevel(weights: number[], rand: () => number): number {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i + 1;
  }
  return weights.length;
}

/**
 * About 30 days of pantry drops and collections per building. Each bin's history
 * starts at zero and ends at its seeded weight, and every collection empties
 * exactly what the preceding deposits put in.
 */
export function buildEvents(): BinEvent[] {
  const now = Date.now();
  const events: BinEvent[] = [];

  for (const bin of bins) {
    const profile = profiles[bin.id];
    const rand = mulberry32(hashOf(bin.id));
    const rate = profile.kgPerDay / WORK_HOURS_PER_DAY; // kg per working hour
    const limit = HISTORY_DAYS * WORK_HOURS_PER_DAY;

    // Fills are found walking back from now, in working hours before now.
    type Fill = { total: number; startH: number; endH: number; collectH: number | null };
    const fills: Fill[] = [];
    const lastDropH = 0.15 + rand() * 0.3;
    let startH = lastDropH + bin.weightKg / rate;
    fills.push({ total: bin.weightKg, startH, endH: lastDropH, collectH: null });
    for (;;) {
      const collectH = startH + 0.1 + rand() * 0.4;
      const endH = collectH + 1 + rand() * 4; // the bin sits full for a few hours
      const total = roundG(Math.min(bin.capacityKg, bin.capacityKg * (0.85 + rand() * 0.2)));
      const fillStartH = endH + total / rate;
      if (fillStartH > limit) break;
      fills.push({ total, startH: fillStartH, endH, collectH });
      startH = fillStartH;
    }
    fills.reverse();

    let weight = 0;
    let seq = 0;
    const id = () => `seed-${bin.short.toLowerCase()}-${++seq}`;
    for (const fill of fills) {
      const drops = fill.total > 0 ? splitKg(fill.total, rand) : [];
      const span = fill.startH - fill.endH;
      drops.forEach((kg, i) => {
        const slot = drops.length > 1 ? span / (drops.length - 1) : 0;
        const h = drops.length > 1 ? fill.startH - i * slot + (rand() - 0.5) * slot * 0.6 : fill.endH;
        const at = workingHoursBefore(now, Math.min(fill.startH, Math.max(fill.endH, h)));
        const level = pickLevel(profile.levelWeights, rand);
        const r = rand();
        const before = weight;
        weight = roundG(weight + kg);
        events.push({
          id: id(),
          at: new Date(at).toISOString(),
          binId: bin.id,
          level,
          pantry: `${bin.short} · L${level}`,
          type: "deposit",
          kg,
          cleanerId: new Date(at).getHours() < 14 ? profile.am : profile.pm,
          source: r < 0.8 ? "ocr" : r < 0.92 ? "reference" : "manual",
          beforeKg: before,
          afterKg: weight,
        });
      });
      if (fill.collectH != null) {
        events.push({
          id: id(),
          at: new Date(workingHoursBefore(now, fill.collectH)).toISOString(),
          binId: bin.id,
          type: "collect",
          kg: weight,
          cleanerId: null,
          collectedBy: COLLECTOR_LABEL,
          beforeKg: weight,
          afterKg: 0,
        });
        weight = 0;
      }
    }
  }

  return events.sort((a, b) => (a.at < b.at ? -1 : 1));
}

const news = [
  { id: "news-1", title: "33 pantries now log every drop-off in real time", tag: "Programme update", publishedAt: "2026-10-28", image: "/images/coffee-machine.jpg", href: "/dashboard" },
  { id: "news-2", title: "The SOSS garden trial: 180 kg of grounds, one growing season", tag: "Impact story", publishedAt: "2026-10-21", image: "/images/garden.jpg", href: "/dashboard" },
  { id: "news-3", title: "Meet the grounds crew keeping the loop turning", tag: "Community", publishedAt: "2026-10-14", image: "/images/programme-intro.jpg", href: "/#about" },
  { id: "news-4", title: "What we learned from our first AI matching pilot", tag: "Innovation", publishedAt: "2026-10-07", image: "/images/research-digital.webp", href: "/dashboard" },
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
      sql`TRUNCATE bin_events, news_items, programme_events, programme_metrics, bins, cleaners RESTART IDENTITY CASCADE`
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
        collectedBy: e.collectedBy ?? null,
        source: e.source ?? null,
        beforeKg: e.beforeKg == null ? null : String(e.beforeKg),
        afterKg: e.afterKg == null ? null : String(e.afterKg),
      }))
    );
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

  console.log(`seeded ${bins.length} bins, ${events.length} events`);
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
