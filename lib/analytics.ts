import { BIN_CAPACITY_KG } from "./bins";
import type { BinEvent } from "./types";

const DAY = 86_400_000;

/* ------------------------------------------------------------ ranges -- */

export type Range = "7d" | "30d" | "term";

export const RANGES: Record<Range, { days: number; label: string; previous: string }> = {
  "7d": { days: 7, label: "7 days", previous: "vs previous 7 days" },
  "30d": { days: 30, label: "30 days", previous: "vs previous 30 days" },
  term: { days: 105, label: "Term", previous: "vs previous term" },
};

export type Window = { from: number; to: number };

export function windowFor(range: Range, now: number): Window {
  return { from: now - RANGES[range].days * DAY, to: now };
}

export function previousWindow(range: Range, now: number): Window {
  const days = RANGES[range].days * DAY;
  return { from: now - 2 * days, to: now - days };
}

const inWindow = (e: BinEvent, w: Window) => {
  const t = Date.parse(e.at);
  return t >= w.from && t < w.to;
};

const roundG = (n: number) => Math.round(n * 1000) / 1000;

export function eventsIn(events: BinEvent[], w: Window, type?: BinEvent["type"]): BinEvent[] {
  return events.filter((e) => (!type || e.type === type) && inWindow(e, w));
}

export function sumKg(events: BinEvent[], w: Window, type: BinEvent["type"]): number {
  return roundG(eventsIn(events, w, type).reduce((s, e) => s + e.kg, 0));
}

/** Change vs the previous period as a fraction, or undefined when there is nothing to compare. */
export function change(current: number, previous: number): number | undefined {
  return previous > 0 ? (current - previous) / previous : undefined;
}

/* ------------------------------------------------------- fill and ETA -- */

export function velocityKgPerDay(events: BinEvent[], binId: string, now = Date.now()): number | null {
  const from = now - 7 * DAY;
  const deps = events.filter(
    (e) => e.type === "deposit" && e.binId === binId && new Date(e.at).getTime() >= from
  );
  if (!deps.length) return null;
  const oldest = Math.min(...deps.map((e) => new Date(e.at).getTime()));
  const days = Math.min(7, Math.max(1, (now - oldest) / DAY));
  return deps.reduce((s, e) => s + e.kg, 0) / days;
}

export function etaText(
  weightKg: number,
  vel: number | null,
  capacityKg = BIN_CAPACITY_KG
): string | null {
  if (weightKg >= capacityKg) return "FULL";
  if (vel == null || vel <= 0) return null;
  const days = (capacityKg - weightKg) / vel;
  if (days < 1 / 24) return "full in <1h";
  if (days < 1) return `full in ~${Math.max(1, Math.round(days * 24))}h`;
  if (days < 30) return `full in ~${Math.round(days)}d`;
  return null;
}

export function ago(iso: string, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/* ------------------------------------------------- where grounds come from -- */

export type BuildingKg = { binId: string; short: string; kg: number; count: number };

/** Kilograms per building for one event type, heaviest first. Buildings with nothing still appear. */
export function kgByBuilding(
  events: BinEvent[],
  bins: Array<{ id: string; short: string }>,
  w: Window,
  type: BinEvent["type"]
): BuildingKg[] {
  const rows = new Map(bins.map((b) => [b.id, { binId: b.id, short: b.short, kg: 0, count: 0 }]));
  for (const e of eventsIn(events, w, type)) {
    const row = rows.get(e.binId);
    if (!row) continue;
    row.kg = roundG(row.kg + e.kg);
    row.count += 1;
  }
  return [...rows.values()].sort((a, b) => b.kg - a.kg);
}

export type PantryStat = { binId: string; level: number; pantry: string; kg: number; count: number };

export function pantriesByKg(
  events: BinEvent[],
  shortOf: (binId: string) => string,
  w: Window
): PantryStat[] {
  const sums = new Map<string, PantryStat>();
  for (const e of eventsIn(events, w, "deposit")) {
    if (e.level == null) continue;
    const key = `${e.binId}::${e.level}`;
    const cur = sums.get(key) ?? {
      binId: e.binId,
      level: e.level,
      pantry: `${shortOf(e.binId)} · L${e.level}`,
      kg: 0,
      count: 0,
    };
    cur.kg = roundG(cur.kg + e.kg);
    cur.count += 1;
    sums.set(key, cur);
  }
  return [...sums.values()].sort((a, b) => b.kg - a.kg);
}

export function levelBreakdown(
  events: BinEvent[],
  binId: string,
  levels: number,
  w: Window
): Array<{ level: string; kg: number; count: number }> {
  const rows = Array.from({ length: levels }, (_, i) => ({ level: `L${i + 1}`, kg: 0, count: 0 }));
  for (const e of eventsIn(events, w, "deposit")) {
    if (e.binId !== binId || e.level == null || e.level < 1 || e.level > levels) continue;
    rows[e.level - 1].kg = roundG(rows[e.level - 1].kg + e.kg);
    rows[e.level - 1].count += 1;
  }
  return rows;
}

/* ------------------------------------------------------------ trends -- */

export type TrendPoint = { label: string; deposited: number; collected: number };

/** Daily buckets for 7 and 30 days, weekly buckets for the term. */
export function trendSeries(events: BinEvent[], range: Range, now: number): TrendPoint[] {
  const weekly = range === "term";
  const size = weekly ? 7 * DAY : DAY;
  const count = Math.ceil(RANGES[range].days / (weekly ? 7 : 1));
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const start = end.getTime() - count * size;
  const points = Array.from({ length: count }, (_, i) => ({
    label: new Date(start + i * size).toLocaleDateString("en-SG", {
      day: "numeric",
      month: "short",
      ...(range === "7d" ? { weekday: "short" } : {}),
    }),
    deposited: 0,
    collected: 0,
  }));
  for (const e of events) {
    const i = Math.floor((Date.parse(e.at) - start) / size);
    if (i < 0 || i >= count) continue;
    const key = e.type === "deposit" ? "deposited" : "collected";
    points[i][key] = roundG(points[i][key] + e.kg);
  }
  return points;
}
