import { BIN_CAPACITY_KG } from "./bins";
import type { BinEvent } from "./types";

const DAY = 86_400_000;

export function repurposedMonth(events: BinEvent[], now = Date.now()): number {
  const m = new Date(now).getMonth();
  const y = new Date(now).getFullYear();
  return events.reduce((s, e) => {
    const d = new Date(e.at);
    return e.type === "collect" && d.getMonth() === m && d.getFullYear() === y ? s + e.kg : s;
  }, 0);
}

export function depositsToday(events: BinEvent[], now = Date.now()): number {
  const start = new Date(now).setHours(0, 0, 0, 0);
  return events.filter((e) => e.type === "deposit" && new Date(e.at).getTime() >= start).length;
}

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

export function ranking(events: BinEvent[]): Array<{ binId: string; kg: number }> {
  const sums = new Map<string, number>();
  for (const e of events) {
    if (e.type === "collect") sums.set(e.binId, (sums.get(e.binId) ?? 0) + e.kg);
  }
  return [...sums.entries()]
    .map(([binId, kg]) => ({ binId, kg: Math.round(kg * 100) / 100 }))
    .sort((a, b) => b.kg - a.kg);
}

export function ago(iso: string, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export type PantryStat = { binId: string; level: number; pantry: string; kg: number; count: number };

export function pantriesByKg(
  events: BinEvent[],
  shortOf: (binId: string) => string,
  days = 7,
  now = Date.now()
): PantryStat[] {
  const from = now - days * DAY;
  const sums = new Map<string, PantryStat>();
  for (const e of events) {
    if (e.type !== "deposit" || new Date(e.at).getTime() < from) continue;
    if (e.level == null) continue;
    const key = `${e.binId}::${e.level}`;
    const cur = sums.get(key) ?? {
      binId: e.binId,
      level: e.level,
      pantry: e.pantry ?? `${shortOf(e.binId)} · L${e.level}`,
      kg: 0,
      count: 0,
    };
    cur.kg = Math.round((cur.kg + e.kg) * 100) / 100;
    cur.count += 1;
    sums.set(key, cur);
  }
  return [...sums.values()].sort((a, b) => b.kg - a.kg);
}

export function levelBreakdown(
  events: BinEvent[],
  binId: string,
  levels: number,
  days = 7,
  now = Date.now()
): Array<{ level: number; kg: number; count: number }> {
  const from = now - days * DAY;
  const rows = Array.from({ length: levels }, (_, i) => ({ level: i + 1, kg: 0, count: 0 }));
  for (const e of events) {
    if (e.type !== "deposit" || e.binId !== binId || e.level == null) continue;
    if (new Date(e.at).getTime() < from || e.level < 1 || e.level > levels) continue;
    rows[e.level - 1].kg = Math.round((rows[e.level - 1].kg + e.kg) * 100) / 100;
    rows[e.level - 1].count += 1;
  }
  return rows;
}

export function quietPantries(
  events: BinEvent[],
  bins: Array<{ id: string; short: string; levels: number }>,
  days = 7,
  now = Date.now()
): string[] {
  const from = now - days * DAY;
  const seen = new Set(
    events
      .filter((e) => e.type === "deposit" && e.level != null && new Date(e.at).getTime() >= from)
      .map((e) => `${e.binId}::${e.level}`)
  );
  const out: string[] = [];
  for (const b of bins) {
    for (let l = 1; l <= b.levels; l++) {
      if (!seen.has(`${b.id}::${l}`)) out.push(`${b.short} · L${l}`);
    }
  }
  return out;
}

export function avgCaddyKg(events: BinEvent[], days = 7, now = Date.now()): number | null {
  const from = now - days * DAY;
  const deps = events.filter((e) => e.type === "deposit" && new Date(e.at).getTime() >= from);
  if (!deps.length) return null;
  return deps.reduce((s, e) => s + e.kg, 0) / deps.length;
}

export function collectionsWeek(
  events: BinEvent[],
  days = 7,
  now = Date.now()
): { count: number; kg: number } {
  const from = now - days * DAY;
  const cols = events.filter((e) => e.type === "collect" && new Date(e.at).getTime() >= from);
  return {
    count: cols.length,
    kg: Math.round(cols.reduce((s, e) => s + e.kg, 0) * 100) / 100,
  };
}
