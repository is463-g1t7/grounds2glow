"use client";

import { useState } from "react";
import Link from "next/link";
import { Recycle } from "lucide-react";
import { ago, type PantryStat } from "@/lib/analytics";
import type { Bin, BinEvent, Cleaner } from "@/lib/types";
import { levelsFor } from "@/lib/bins";

const card = "rounded-md border border-black/10 bg-white p-5 shadow-card";
const h2 = "font-display text-[24px] leading-8 text-smu-navy";
const sub = "mt-1 text-[12px] text-smu-muted";

export function CollectionQueue({
  bins,
  etas,
  onCollect,
  onSelect,
}: {
  bins: Bin[];
  etas: Map<string, string | null>;
  onCollect: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  if (!bins.length) {
    return (
      <div className="flex h-full flex-col justify-center rounded-md border border-smu-success/30 bg-smu-success/5 p-5 text-[13px] text-[#287a28]">
        <p className="font-semibold">All clear</p>
        <p>No bin needs collection right now.</p>
      </div>
    );
  }
  return (
    <ol className="flex flex-col divide-y divide-black/8 rounded-md border border-black/10 bg-white shadow-card">
      {bins.map((b, i) => (
        <li key={b.id} className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-5 text-[12px] font-bold tabular-nums text-black/40">{i + 1}</span>
          <button type="button" onClick={() => onSelect(b.id)} className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[13px] font-semibold text-smu-navy">{b.name}</span>
            <span className="block text-[11px] tabular-nums text-smu-muted">
              {b.weightKg.toFixed(2)} kg{etas.get(b.id) ? ` · ${etas.get(b.id)}` : ""}
            </span>
          </button>
          <button type="button" onClick={() => onCollect(b.id)} className="btn-smu btn-smu-outline btn-smu-sm shrink-0">
            Collect
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Cleaner empties a pantry caddy into the building's smart bin (hand-logged). */
export function CleanerPanel({
  bins,
  cleaners,
  initialBinId,
  onDeposit,
}: {
  bins: Bin[];
  cleaners: Cleaner[];
  initialBinId: string;
  onDeposit: (binId: string, level: number, kg: number, cleanerId: string) => void;
}) {
  const [cleanerId, setCleanerId] = useState(cleaners[0]?.id ?? "");
  const [binId, setBinId] = useState(initialBinId);
  const [level, setLevel] = useState(2);
  const [kg, setKg] = useState(0.3);
  const bin = bins.find((b) => b.id === binId) ?? bins[0];
  const levels = levelsFor(bin);
  const safeLevel = Math.min(Math.max(1, level), levels);
  const binFull = bin.weightKg >= bin.capacityKg;
  const select = "h-9 rounded border border-black/15 bg-white px-2 text-[12.5px] focus:border-smu-gold focus:outline-none";

  return (
    <section className={card}>
      <h2 className={h2}>Empty pantry → bin</h2>
      <p className={sub}>
        Hand-log a drop-off, or use the{" "}
        <Link href="/cleaner" target="_blank" rel="noreferrer" className="text-smu-gold underline underline-offset-2">
          cleaner app
        </Link>{" "}
        to scan a pass and weigh by camera.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-[12.5px]">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-smu-muted">Cleaner</span>
          <select value={cleanerId} onChange={(e) => setCleanerId(e.target.value)} className={select}>
            {cleaners.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.pass}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12.5px]">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-smu-muted">Building bin</span>
          <select
            value={bin.id}
            onChange={(e) => {
              setBinId(e.target.value);
              setLevel(1);
            }}
            className={select}
          >
            {bins.map((b) => (
              <option key={b.id} value={b.id}>
                {b.short} — {b.weightKg.toFixed(1)} kg
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-[12.5px]">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-smu-muted">Pantry level</span>
            <select value={safeLevel} onChange={(e) => setLevel(Number(e.target.value))} className={select}>
              {Array.from({ length: levels }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  L{i + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1 text-[12.5px]">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.9px] text-smu-muted">Caddy (kg)</span>
            <input
              type="number"
              min={0.05}
              max={bin.capacityKg}
              step={0.05}
              value={kg}
              onChange={(e) => setKg(Number(e.target.value))}
              className={`${select} tabular-nums`}
            />
          </label>
        </div>
        <div className="flex gap-1.5">
          {[0.2, 0.3, 0.5, 1].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setKg(q)}
              className={`h-7 flex-1 rounded-full text-[11px] font-medium tabular-nums transition-colors ${
                kg === q ? "bg-smu-navy text-white" : "border border-black/10 hover:bg-smu-cream"
              }`}
            >
              {q.toFixed(1)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onDeposit(bin.id, safeLevel, kg, cleanerId)}
          disabled={kg <= 0 || binFull}
          className="btn-smu btn-smu-outline mt-1 disabled:opacity-40"
        >
          {binFull ? `${bin.short} is FULL — collect first` : `Empty ${bin.short} · L${safeLevel} into bin`}
        </button>
      </div>
    </section>
  );
}

export function PantryLeaderboard({ stats }: { stats: PantryStat[] }) {
  const top = stats.slice(0, 5);
  const max = Math.max(0.01, ...top.map((r) => r.kg));
  return (
    <section className={card}>
      <h2 className={h2}>Top pantries · 7d</h2>
      <p className={sub}>Where the grounds come from.</p>
      {top.length === 0 ? (
        <p className="mt-3 text-[13px] text-smu-muted">No pantry deposits logged yet.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-2.5">
          {top.map((r, i) => (
            <li key={`${r.binId}-${r.level}`} className="flex items-center gap-2 text-[12px]">
              <span className="w-4 font-bold tabular-nums text-black/35">{i + 1}</span>
              <span className="w-20 shrink-0 font-medium text-smu-navy">{r.pantry}</span>
              <div className="h-0.5 flex-1 overflow-hidden bg-black/10">
                <div className="h-full bg-smu-gold" style={{ width: `${Math.max(4, (r.kg / max) * 100)}%` }} />
              </div>
              <span className="w-20 shrink-0 text-right tabular-nums text-smu-muted">
                {r.kg.toFixed(1)} kg · {r.count}×
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function LevelBreakdown({
  binShort,
  rows,
}: {
  binShort: string;
  rows: Array<{ level: number; kg: number; count: number }>;
}) {
  const max = Math.max(0.01, ...rows.map((r) => r.kg));
  return (
    <section className={card}>
      <h2 className={h2}>{binShort} by level · 7d</h2>
      <p className={sub}>Which floor fills the bin. Follows the selected bin.</p>
      <ol className="mt-4 flex flex-col gap-2.5">
        {rows.map((r) => (
          <li key={r.level} className="flex items-center gap-2 text-[12px]">
            <span className="w-7 shrink-0 font-medium tabular-nums">L{r.level}</span>
            <div className="h-0.5 flex-1 overflow-hidden bg-black/10">
              <div
                className="h-full bg-smu-navy"
                style={{ width: r.kg > 0 ? `${Math.max(4, (r.kg / max) * 100)}%` : "0%" }}
              />
            </div>
            <span className="w-20 shrink-0 text-right tabular-nums text-smu-muted">
              {r.kg > 0 ? `${r.kg.toFixed(1)} kg · ${r.count}×` : "—"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PantryWatch({
  quiet,
  avgCaddy,
  week,
}: {
  quiet: string[];
  avgCaddy: number | null;
  week: { count: number; kg: number };
}) {
  return (
    <section className={card}>
      <h2 className={h2}>Pantry watch</h2>
      <p className={sub}>Supervision cues for the week.</p>
      <dl className="mt-4 flex flex-col gap-3 text-[12.5px]">
        <div className="flex justify-between gap-2">
          <dt className="text-smu-muted">Avg caddy emptied</dt>
          <dd className="tabular-nums text-smu-navy">{avgCaddy == null ? "—" : `${avgCaddy.toFixed(2)} kg`}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-smu-muted">Collections · 7d</dt>
          <dd className="tabular-nums text-smu-navy">
            {week.count}× · {week.kg.toFixed(1)} kg
          </dd>
        </div>
        <div>
          <dt className="text-smu-muted">Quiet pantries · 7d</dt>
          <dd className="mt-1 text-[12px] leading-5">
            {quiet.length === 0 ? (
              <span className="text-[#287a28]">Every pantry contributed ✓</span>
            ) : (
              <>
                {quiet.slice(0, 5).join(" · ")}
                {quiet.length > 5 && <span className="text-black/40"> · +{quiet.length - 5} more</span>}
              </>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function BuildingLeaderboard({
  ranking,
  bins,
}: {
  ranking: Array<{ binId: string; kg: number }>;
  bins: Bin[];
}) {
  const max = Math.max(0.01, ...ranking.map((r) => r.kg));
  const name = (id: string) => bins.find((b) => b.id === id)?.short ?? id;
  return (
    <section className={card}>
      <h2 className={h2}>Building leaderboard</h2>
      <p className={sub}>Coffee grounds repurposed, all time.</p>
      {ranking.length === 0 ? (
        <p className="mt-3 text-[13px] text-smu-muted">No collections logged yet.</p>
      ) : (
        <ol className="mt-4 flex flex-col gap-2.5">
          {ranking.map((r, i) => (
            <li key={r.binId} className="flex items-center gap-2 text-[12px]">
              <span className="w-4 font-bold tabular-nums text-black/35">{i + 1}</span>
              <span className="w-14 shrink-0 font-medium text-smu-navy">{name(r.binId)}</span>
              <div className="h-0.5 flex-1 overflow-hidden bg-black/10">
                <div className="h-full bg-smu-gold" style={{ width: `${Math.max(4, (r.kg / max) * 100)}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right tabular-nums text-smu-muted">{r.kg.toFixed(1)} kg</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function ActivityFeed({
  events,
  bins,
  cleaners,
  now,
}: {
  events: BinEvent[];
  bins: Bin[];
  cleaners: Cleaner[];
  now: number;
}) {
  const short = (id: string) => bins.find((b) => b.id === id)?.short ?? id;
  const where = (e: BinEvent) => e.pantry ?? short(e.binId);
  return (
    <section className={card}>
      <h2 className={h2}>Recent activity</h2>
      <p className={sub}>Deposits and collections as they happen.</p>
      <ol className="mt-4 flex flex-col gap-2.5 text-[12.5px]">
        {events.slice(0, 7).map((e) => (
          <li key={e.id} className="flex items-baseline justify-between gap-2">
            <span>
              {e.type === "collect" ? (
                <>
                  <span className="font-semibold text-[#287a28]">✓</span> Collected{" "}
                  <span className="font-semibold tabular-nums">{e.kg.toFixed(1)} kg</span> from {short(e.binId)}
                </>
              ) : (
                <>
                  <span className="font-semibold tabular-nums text-smu-navy">+{e.kg.toFixed(1)} kg</span> →{" "}
                  {where(e)}
                  {cleaners.find((c) => c.id === e.cleanerId) && (
                    <span className="text-black/40"> · {cleaners.find((c) => c.id === e.cleanerId)?.name}</span>
                  )}
                </>
              )}
            </span>
            <span className="shrink-0 text-[10.5px] text-black/40">{ago(e.at, now)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function MonthlyChart({
  currentTotalKg,
  events,
}: {
  currentTotalKg: number;
  events: BinEvent[];
}) {
  const now = new Date();
  const prior = [2, 1].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const kg = events
      .filter((e) => {
        if (e.type !== "collect") return false;
        const at = new Date(e.at);
        return at.getMonth() === d.getMonth() && at.getFullYear() === d.getFullYear();
      })
      .reduce((sum, e) => sum + e.kg, 0);
    return {
      month: d.toLocaleDateString("en-SG", { month: "short" }),
      kg: Math.round(kg * 10) / 10,
    };
  });
  const data = [
    ...prior,
    {
      month: now.toLocaleDateString("en-SG", { month: "short" }),
      kg: currentTotalKg,
    },
  ];
  const max = Math.max(1, ...data.map((d) => d.kg));
  return (
    <section className={card}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className={h2}>Repurposed this month</h2>
          <p className={sub}>Coffee grounds diverted from landfill, by month.</p>
        </div>
        <Recycle className="h-4 w-4 text-smu-gold" />
      </div>
      <p className="mt-3 font-display text-[32px] leading-9 text-smu-navy">
        {currentTotalKg.toFixed(1)} <span className="font-sans text-[14px] text-smu-muted">kg</span>
      </p>
      <div className="mt-4 flex h-36 items-end gap-3 border-b border-black/10 pb-1">
        {data.map((d, i) => (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-[10px] tabular-nums text-smu-muted">{d.kg.toFixed(0)}</span>
            <div
              className={`w-full rounded-t ${i === data.length - 1 ? "bg-smu-success" : "bg-smu-gold/45"}`}
              style={{ height: `${Math.max(3, (d.kg / max) * 110)}px` }}
            />
            <span className="text-[11px] text-smu-muted">{d.month}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
