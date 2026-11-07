import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { COLLECTOR_LABEL } from "./bins";
import {
  binEvents,
  bins,
  cleaners,
  newsItems,
  programmeEvents,
  programmeMetrics,
} from "@/db/schema";
import type {
  Bin,
  BinEvent,
  BootstrapData,
  Cleaner,
  EventSource,
  NewsItem,
  ProgrammeEvent,
  ProgrammeMetric,
} from "./types";

const num = (v: string | number | null) => Number(v ?? 0);
const iso = (v: Date) => v.toISOString();

type EventRow = typeof binEvents.$inferSelect;

function toEvent(r: EventRow): BinEvent {
  return {
    id: r.id,
    at: iso(r.at),
    binId: r.binId,
    level: r.level,
    pantry: r.pantry,
    type: r.type as BinEvent["type"],
    kg: num(r.kg),
    cleanerId: r.cleanerId,
    collectedBy: r.collectedBy,
    source: r.source as EventSource | null,
    beforeKg: r.beforeKg == null ? null : num(r.beforeKg),
    afterKg: r.afterKg == null ? null : num(r.afterKg),
    photo: r.photo,
  };
}

export async function getBins(): Promise<Bin[]> {
  const db = getDb();
  const rows = await db.select().from(bins).orderBy(asc(bins.short));
  return rows.map((r) => ({
    id: r.id,
    short: r.short,
    name: r.name,
    pantry: r.pantry,
    weightKg: num(r.weightKg),
    capacityKg: num(r.capacityKg),
    levels: r.levels,
    updatedAt: iso(r.updatedAt),
  }));
}

export async function getEvents(limit?: number): Promise<BinEvent[]> {
  const db = getDb();
  const query = db.select().from(binEvents).orderBy(desc(binEvents.at));
  const rows = limit ? await query.limit(limit) : await query;
  return rows.map(toEvent);
}

export async function getCleaners(): Promise<Cleaner[]> {
  const db = getDb();
  const rows = await db.select().from(cleaners).orderBy(asc(cleaners.name));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    initials: r.initials,
    pass: r.pass,
    shift: r.shift as Cleaner["shift"],
    vendor: r.vendor,
  }));
}

export async function getNews(): Promise<NewsItem[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(newsItems)
    .orderBy(asc(newsItems.sort), desc(newsItems.publishedAt));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    tag: r.tag,
    publishedAt: r.publishedAt,
    image: r.image,
    href: r.href,
  }));
}

export async function getProgrammeEvents(): Promise<ProgrammeEvent[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(programmeEvents)
    .orderBy(asc(programmeEvents.sort), asc(programmeEvents.eventDate));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    eventDate: r.eventDate,
    venue: r.venue,
    description: r.description,
    image: r.image,
  }));
}

export async function getMetrics(): Promise<ProgrammeMetric[]> {
  const db = getDb();
  const rows = await db.select().from(programmeMetrics).orderBy(asc(programmeMetrics.sort));
  return rows.map((r) => ({
    key: r.key,
    value: r.value,
    label: r.label,
    detail: r.detail,
    tone: r.tone as ProgrammeMetric["tone"],
  }));
}

export async function getBootstrap(): Promise<BootstrapData> {
  const [binRows, events, cleanerRows, news, eventsProgramme, metrics] =
    await Promise.all([
      getBins(),
      getEvents(),
      getCleaners(),
      getNews(),
      getProgrammeEvents(),
      getMetrics(),
    ]);
  return {
    bins: binRows,
    events,
    cleaners: cleanerRows,
    news,
    programmeEvents: eventsProgramme,
    metrics,
  };
}

type ReadingInput = {
  binId: string;
  level: number;
  afterKg: number;
  source: EventSource;
  cleanerId?: string | null;
  photo?: string | null;
};

/**
 * The floor scale shows the bin's running total, so a reading is the difference
 * from the last known total. Returns null when the reading is not an increase.
 */
export async function createReading(input: ReadingInput): Promise<BinEvent | null> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [bin] = await tx.select().from(bins).where(eq(bins.id, input.binId)).for("update");
    if (!bin) throw new Error("Unknown bin.");
    if (!Number.isInteger(input.level) || input.level < 1 || input.level > bin.levels) {
      throw new Error("Unknown pantry level.");
    }
    if (input.cleanerId) {
      const [cleaner] = await tx
        .select({ id: cleaners.id })
        .from(cleaners)
        .where(eq(cleaners.id, input.cleanerId));
      if (!cleaner) throw new Error("Unknown cleaner pass.");
    }

    const before = num(bin.weightKg);
    const after = Math.min(num(bin.capacityKg), Math.max(0, Math.round(input.afterKg * 100) / 100));
    if (after <= before) return null;

    const at = new Date();
    const [row] = await tx
      .insert(binEvents)
      .values({
        at,
        binId: bin.id,
        level: input.level,
        pantry: `${bin.short} · L${input.level}`,
        type: "deposit",
        kg: String(Math.round((after - before) * 100) / 100),
        cleanerId: input.cleanerId ?? null,
        source: input.source,
        beforeKg: String(before),
        afterKg: String(after),
        photo: input.photo ?? null,
      })
      .returning();
    await tx
      .update(bins)
      .set({ weightKg: String(after), updatedAt: at })
      .where(eq(bins.id, bin.id));
    return toEvent(row);
  });
}

export async function collectBin(
  binId: string,
  cleanerId?: string | null
): Promise<BinEvent | null> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [bin] = await tx.select().from(bins).where(eq(bins.id, binId)).for("update");
    if (!bin) throw new Error("Unknown bin.");
    if (cleanerId) {
      const [cleaner] = await tx
        .select({ id: cleaners.id })
        .from(cleaners)
        .where(eq(cleaners.id, cleanerId));
      if (!cleaner) throw new Error("Unknown cleaner pass.");
    }
    if (num(bin.weightKg) <= 0) return null;

    const kg = num(bin.weightKg);
    const at = new Date();
    const [row] = await tx
      .insert(binEvents)
      .values({
        at,
        binId,
        type: "collect",
        kg: String(kg),
        // A cleaner who swaps the bin is kept on the record; the grounds go to the volunteer.
        cleanerId: cleanerId ?? null,
        collectedBy: COLLECTOR_LABEL,
        beforeKg: String(kg),
        afterKg: "0",
      })
      .returning();
    await tx.update(bins).set({ weightKg: "0", updatedAt: at }).where(eq(bins.id, binId));
    return toEvent(row);
  });
}

/** Server-side demo sync: one new floor-scale reading from a random bin. */
export async function syncRandomReading(): Promise<BinEvent | null> {
  const bins = await getBins();
  const candidates = bins.filter((b) => b.weightKg < b.capacityKg);
  if (!candidates.length) return null;
  const bin = candidates[Math.floor(Math.random() * candidates.length)];
  const level = 1 + Math.floor(Math.random() * bin.levels);
  const afterKg = Math.min(
    bin.capacityKg,
    Math.round((bin.weightKg + 0.1 + Math.random() * 0.3) * 100) / 100
  );
  return createReading({ binId: bin.id, level, afterKg, source: "ocr" });
}

/** Server-side demo simulation step: deposit, then auto-collect when two bins are full. */
export async function simulateStep(): Promise<BinEvent | null> {
  const bins = await getBins();
  const candidates = bins.filter((b) => b.weightKg < b.capacityKg);
  if (!candidates.length) return null;
  const bin = candidates[Math.floor(Math.random() * candidates.length)];
  const level = 1 + Math.floor(Math.random() * bin.levels);
  const afterKg = Math.min(
    bin.capacityKg,
    Math.round((bin.weightKg + 0.2 + Math.random() * 0.6) * 100) / 100
  );
  const event = await createReading({ binId: bin.id, level, afterKg, source: "demo" });
  const next = await getBins();
  const full = next.filter((b) => b.weightKg >= b.capacityKg);
  if (full.length >= 2) {
    const oldest = [...full].sort((a, b) => (a.updatedAt < b.updatedAt ? -1 : 1))[0];
    await collectBin(oldest.id);
  }
  return event;
}
