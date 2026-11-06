"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  Download,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Truck,
} from "lucide-react";
import { PageHeader } from "@/components/smu/page-chrome";
import { StatStrip } from "@/components/smu/stat-strip";
import { demoControlsEnabled } from "@/lib/demo-controls";
import { Toast } from "@/components/smu/toast";
import { CampusMap } from "@/components/smu/campus-map";
import { BinSpotlight } from "@/components/dashboard/bin-spotlight";
import { AuditTrail } from "@/components/dashboard/audit-trail";
import {
  ActivityFeed,
  BuildingLeaderboard,
  CleanerPanel,
  CollectionQueue,
  LevelBreakdown,
  MonthlyChart,
  PantryLeaderboard,
  PantryWatch,
} from "@/components/dashboard/fleet-panels";
import {
  avgCaddyKg,
  collectionsWeek,
  depositsToday,
  etaText,
  levelBreakdown,
  pantriesByKg,
  quietPantries,
  ranking,
  repurposedMonth,
  velocityKgPerDay,
} from "@/lib/analytics";
import { levelsFor, pantryLabel, statusFor } from "@/lib/bins";
import { apiRequest, useBootstrap } from "@/lib/client/use-bootstrap";
import { useNow } from "@/lib/client/use-now";
import type { BinEvent, BootstrapData } from "@/lib/types";

type Filter = "all" | "needs" | "ok";
type Period = "7d" | "30d" | "term";

function buildTrend(events: BinEvent[], period: Period, now: number): { label: string; kg: number; target: number }[] {
  const day = 86_400_000;
  const deposits = events.filter((e) => e.type === "deposit");
  if (period === "7d") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const from = start.getTime() - (6 - i) * day;
      const kg = deposits
        .filter((e) => {
          const t = Date.parse(e.at);
          return t >= from && t < from + day;
        })
        .reduce((s, e) => s + e.kg, 0);
      return {
        label: new Date(from).toLocaleDateString("en-SG", { weekday: "short" }),
        kg: Math.round(kg * 100) / 100,
        target: 0.6,
      };
    });
  }
  if (period === "30d") {
    return Array.from({ length: 4 }, (_, i) => {
      const from = now - (4 - i) * 7 * day;
      const kg = deposits
        .filter((e) => {
          const t = Date.parse(e.at);
          return t >= from && t < from + 7 * day;
        })
        .reduce((s, e) => s + e.kg, 0);
      return { label: `W${i + 1}`, kg: Math.round(kg * 100) / 100, target: 4.2 };
    });
  }
  return Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - (3 - i), 1);
    const month = d.getMonth();
    const year = d.getFullYear();
    const kg = deposits
      .filter((e) => {
        const t = new Date(e.at);
        return t.getMonth() === month && t.getFullYear() === year;
      })
      .reduce((s, e) => s + e.kg, 0);
    return {
      label: d.toLocaleDateString("en-SG", { month: "short" }),
      kg: Math.round(kg * 100) / 100,
      target: 30,
    };
  });
}

export function DashboardClient() {
  const data = useBootstrap(4000);
  const params = useSearchParams();
  const [selectedId, setSelectedId] = useState(() => params.get("bin") ?? "bin-soe");
  const [filter, setFilter] = useState<Filter>("all");
  const [demoOn, setDemoOn] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [liveEvent, setLiveEvent] = useState<BinEvent | null>(null);
  const [period, setPeriod] = useState<Period>("7d");
  const [insightIndex, setInsightIndex] = useState(0);
  const seenEvents = useRef<Set<string> | null>(null);

  const bins = data.data.bins;
  const events = data.data.events;
  const cleaners = data.data.cleaners;
  const now = useNow();

  // Detect genuinely new cleaner drops from polling, not history on mount.
  useEffect(() => {
    if (!events.length) return;
    if (seenEvents.current === null) {
      seenEvents.current = new Set(events.map((e) => e.id));
      return;
    }
    const fresh = events.filter((e) => !seenEvents.current?.has(e.id));
    for (const e of fresh) seenEvents.current.add(e.id);
    const live = fresh.find(
      (e) =>
        e.type === "deposit" &&
        (e.source === "ocr" || e.source === "reference") &&
        e.cleanerId
    );
    if (live) {
      setLiveEvent(live);
      setSelectedId(live.binId);
    }
  }, [events]);

  useEffect(() => {
    if (!demoOn) return;
    const timer = window.setInterval(async () => {
      try {
        await apiRequest("/api/simulate", { method: "POST" });
        await data.refresh();
      } catch {
        setDemoOn(false);
      }
    }, 1500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoOn]);

  const total = bins.reduce((s, b) => s + b.weightKg, 0);
  const pantryLevels = bins.reduce((s, b) => s + b.levels, 0);
  const full = bins.filter((b) => statusFor(b.weightKg, b.capacityKg) === "full").length;
  const near = bins.filter((b) => statusFor(b.weightKg, b.capacityKg) === "near").length;
  const needs = full + near;
  const repurposed = repurposedMonth(events, now);
  const today = depositsToday(events, now);

  const etas = useMemo(
    () =>
      new Map(
        bins.map((b) => [
          b.id,
          etaText(b.weightKg, velocityKgPerDay(events, b.id, now), b.capacityKg),
        ] as const)
      ),
    [bins, events, now]
  );
  const queue = useMemo(
    () =>
      bins
        .filter((b) => statusFor(b.weightKg, b.capacityKg) !== "ok")
        .sort((a, b) =>
          statusFor(a.weightKg, a.capacityKg) === statusFor(b.weightKg, b.capacityKg)
            ? b.weightKg - a.weightKg
            : statusFor(a.weightKg, a.capacityKg) === "full"
              ? -1
              : 1
        ),
    [bins]
  );
  const visible = useMemo(
    () =>
      bins.filter((b) =>
        filter === "all"
          ? true
          : filter === "needs"
            ? statusFor(b.weightKg, b.capacityKg) !== "ok"
            : statusFor(b.weightKg, b.capacityKg) === "ok"
      ),
    [bins, filter]
  );
  const dimmed = useMemo(
    () => new Set(bins.filter((b) => !visible.includes(b)).map((b) => b.id)),
    [bins, visible]
  );
  const selected = bins.find((b) => b.id === selectedId) ?? bins[0] ?? null;
  const shortOf = (id: string) => bins.find((b) => b.id === id)?.short ?? id;
  const pantryStats = useMemo(() => pantriesByKg(events, shortOf, 7, now), [events, bins, now]);
  const topByBin = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pantryStats) if (!map.has(p.binId)) map.set(p.binId, `L${p.level}`);
    return map;
  }, [pantryStats]);
  const breakdown = useMemo(
    () => (selected ? levelBreakdown(events, selected.id, levelsFor(selected), 7, now) : []),
    [events, selected, now]
  );
  const quiet = useMemo(() => quietPantries(events, bins, 7, now), [events, bins, now]);
  const avgCaddy = avgCaddyKg(events, 7, now);
  const week = collectionsWeek(events, 7, now);
  const trend = useMemo(() => buildTrend(events, period, now), [events, period, now]);
  const chartTotal = trend.reduce((s, p) => s + p.kg, 0);
  const chartTarget = trend.reduce((s, p) => s + p.target, 0);

  const insights = [
    queue[0]
      ? `${queue[0].short} is ${queue[0].weightKg.toFixed(2)} kg and first in the queue${
          etas.get(queue[0].id) ? ` — ${etas.get(queue[0].id)}` : ""
        }. Collect before the next pantry run.`
      : "Every bin is below the near-full threshold. The fleet is clear for now.",
    (() => {
      const busiest = [...breakdown].sort((a, b) => b.kg - a.kg)[0];
      return busiest && busiest.kg > 0
        ? `${selected?.short ?? "This bin"} L${busiest.level} is the busiest pantry this week: ${busiest.kg.toFixed(
            1
          )} kg across ${busiest.count} drop-offs.`
        : `${selected?.short ?? "This bin"} has no pantry deposits in the last seven days.`;
    })(),
    quiet.length
      ? `${quiet.length} pantries have no drops this week. Start with ${quiet.slice(0, 3).join(", ")}.`
      : "Every pantry contributed this week — the loop is well distributed.",
  ];

  if (data.loading) {
    return (
      <div className="bg-smu-cream pt-[160px]">
        <div className="container-smu pb-24">
          <p className="font-display text-[48px] leading-[60px] text-black">Live operations</p>
          <p className="mt-3 text-[18px] text-smu-muted">Loading bin telemetry�</p>
        </div>
      </div>
    );
  }

  if (!bins.length || !selected) {
    return (
      <div className="bg-smu-cream pt-[160px]">
        <div className="container-smu pb-24">
          <p className="font-display text-[48px] leading-[60px] text-black">Live operations</p>
          <p className="mt-3 text-[18px] text-smu-muted">
            No bins found. Run the database seed script to load the demo data.
          </p>
          {data.error && <p className="mt-2 text-sm text-smu-danger">{data.error}</p>}
        </div>
      </div>
    );
  }

  function select(id: string) {
    setSelectedId(id);
    window.requestAnimationFrame(() =>
      document.getElementById("bin-spotlight")?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    );
  }

  function applyFilter(f: Filter) {
    setFilter(f);
    const keep = (b: (typeof bins)[number]) =>
      f === "all"
        ? true
        : f === "needs"
          ? statusFor(b.weightKg, b.capacityKg) !== "ok"
          : statusFor(b.weightKg, b.capacityKg) === "ok";
    const current = bins.find((b) => b.id === selectedId);
    if (current && !keep(current)) {
      const first = bins.find(keep);
      if (first) setSelectedId(first.id);
    }
  }

  async function collect(id: string) {
    const b = bins.find((x) => x.id === id);
    if (!b || b.weightKg <= 0) return;
    try {
      await apiRequest("/api/collect", { method: "POST", body: JSON.stringify({ binId: id }) });
      await data.refresh();
      setToast(`${b.short} collected.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to collect bin.");
    }
  }

  async function deposit(binId: string, level: number, kg: number, cleanerId: string) {
    const b = bins.find((x) => x.id === binId);
    if (!b || b.weightKg >= b.capacityKg) return;
    try {
      await apiRequest("/api/readings", {
        method: "POST",
        body: JSON.stringify({
          binId,
          level,
          cleanerId,
          afterKg: Math.round((b.weightKg + kg) * 100) / 100,
          source: "manual",
        }),
      });
      await data.refresh();
      setToast(`${pantryLabel(b, level)} emptied into ${b.short}.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to log drop-off.");
    }
  }

  async function syncFromServer() {
    try {
      await apiRequest("/api/sync", { method: "POST" });
      await data.refresh();
      setSyncedAt(new Date().toLocaleTimeString());
      setToast("Synced one new floor-scale reading.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to sync.");
    }
  }

  async function resetDemo() {
    setDemoOn(false);
    setSyncedAt(null);
    setLiveEvent(null);
    try {
      const next = await apiRequest<BootstrapData>("/api/reset", { method: "POST" });
      data.setData(next);
      seenEvents.current = new Set(next.events.map((e) => e.id));
      setToast("Demo data reset to seed values.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to reset data.");
    }
  }

  function exportReport() {
    const binHead = ["bin", "building", "school", "weight_kg", "capacity_kg", "updated_at"];
    const binRows = bins.map((b) => [b.id, b.name, b.short, b.weightKg.toFixed(2), String(b.capacityKg), b.updatedAt]);
    const eventHead = ["time", "bin", "type", "pantry", "cleaner", "kg", "before_kg", "after_kg", "source"];
    const eventRows = events.map((e) => [
      e.at,
      e.binId,
      e.type,
      e.pantry ?? "",
      cleaners.find((c) => c.id === e.cleanerId)?.name ?? "",
      e.kg.toFixed(2),
      e.beforeKg?.toFixed(2) ?? "",
      e.afterKg?.toFixed(2) ?? "",
      e.source ?? "",
    ]);
    const csv = [binHead, ...binRows, [], eventHead, ...eventRows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "smu-circular-coffee-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    setToast("Dashboard report exported as CSV.");
  }

  return (
    <>
      <PageHeader
        title="Live operations"
        lead={`Spent coffee grounds, weighed across ${bins.length} buildings and ${pantryLevels} pantry levels — with every drop-off signed and traced.`}
        crumbs={[{ label: "Home", href: "/" }, { label: "Live dashboard" }]}
        actions={
          <>
            <span className="inline-flex items-center gap-2 rounded-full border border-smu-success/30 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#287a28]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-smu-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-smu-success" />
              </span>
              Live
            </span>
            <Link href="/cleaner" target="_blank" rel="noreferrer" className="btn-smu btn-smu-outline">
              Cleaner app <ArrowUpRight className="h-4 w-4" />
            </Link>
            {demoControlsEnabled && (
              <>
                <button type="button" onClick={() => setDemoOn((v) => !v)} className="btn-smu btn-smu-outline">
                  {demoOn ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {demoOn ? "Pause live day" : "Simulate live day"}
                </button>
                <button type="button" onClick={resetDemo} className="btn-smu btn-smu-outline">
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
              </>
            )}
          </>
        }
      />

      <div id="impact" className="scroll-mt-[100px]">
        <StatStrip
          stats={[
            { value: `${total.toFixed(2)} kg`, label: "Fleet total", detail: `Across ${bins.length} buildings`, tone: "gold" },
            { value: `${repurposed.toFixed(1)} kg`, label: "Repurposed · month", detail: "From collections", tone: "success" },
            { value: String(needs), label: "Needs collection", detail: `${full} full · ${near} near full`, tone: "navy" },
            { value: String(today), label: "Pantry empties · today", detail: "Deposits since midnight", tone: "navy" },
          ]}
        />
      </div>

      <section className="bg-smu-cream section-pad">
        <div className="container-smu">
          {liveEvent && (
            <div role="status" className="fade-up mb-5 flex flex-wrap items-center gap-3 rounded-md border border-smu-success/30 bg-[#eef7ea] px-4 py-3 text-[13px]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-smu-navy text-[10px] font-bold text-white">
                {cleaners.find((c) => c.id === liveEvent.cleanerId)?.initials ?? "?"}
              </span>
              <p className="min-w-0 flex-1">
                <span className="font-semibold text-[#287a28]">Live drop-off · </span>
                {cleaners.find((c) => c.id === liveEvent.cleanerId)?.name ?? "A cleaner"} emptied{" "}
                <span className="font-medium">{liveEvent.pantry}</span> into the central bin:{" "}
                <span className="font-semibold tabular-nums">+{liveEvent.kg.toFixed(2)} kg</span>{" "}
                <span className="text-smu-muted tabular-nums">
                  ({liveEvent.beforeKg?.toFixed(2)} → {liveEvent.afterKg?.toFixed(2)} kg)
                </span>
              </p>
              <button type="button" onClick={() => setLiveEvent(null)} className="shrink-0 text-[11px] text-smu-muted underline underline-offset-2">
                Dismiss
              </button>
            </div>
          )}

          <div className="mb-5 flex flex-wrap items-center gap-2">
            {(
              [
                ["all", "All bins"],
                ["needs", `Needs collection (${needs})`],
                ["ok", "OK"],
              ] as Array<[Filter, string]>
            ).map(([f, label]) => (
              <button
                key={f}
                type="button"
                onClick={() => applyFilter(f)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  filter === f ? "bg-smu-navy text-white" : "border border-black/10 bg-white hover:bg-smu-cream"
                }`}
              >
                {label}
              </button>
            ))}
            {demoControlsEnabled && (
              <button type="button" onClick={syncFromServer} className="ml-auto btn-smu btn-smu-outline btn-smu-sm">
                <RefreshCw className="h-3.5 w-3.5" /> Sync{syncedAt ? ` · ${syncedAt}` : ""}
              </button>
            )}
            <button type="button" onClick={exportReport} className="btn-smu btn-smu-outline btn-smu-sm">
              <Download className="h-3.5 w-3.5" /> Export report
            </button>
          </div>

          <CampusMap bins={bins} selectedId={selected.id} dimmedIds={dimmed} onSelect={select} />

          <div className="mt-5">
            <BinSpotlight
              bins={bins}
              selectedId={selected.id}
              dimmedIds={dimmed}
              etas={etas}
              topPantries={topByBin}
              onSelect={select}
              onCollect={collect}
            />
          </div>

          <div className="mt-5">
            <AuditTrail bin={selected} events={events} cleaners={cleaners} now={now} highlightId={liveEvent?.id ?? null} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            <div className="rounded-md border border-black/10 bg-white p-5 shadow-card md:p-7 lg:col-span-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-[24px] leading-8 text-smu-navy">Collection trend</h2>
                  <p className="mt-1 text-[13px] text-smu-muted">
                    {chartTotal.toFixed(1)} kg deposited in this view · expected {chartTarget.toFixed(1)} kg
                  </p>
                </div>
                <div className="flex rounded border border-black/10 p-0.5" role="group" aria-label="Chart period">
                  {(["7d", "30d", "term"] as Period[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p)}
                      aria-pressed={period === p}
                      className={`rounded px-3 py-1 text-[11.5px] font-semibold transition-colors ${
                        period === p ? "bg-smu-navy text-white" : "text-smu-muted hover:text-smu-navy"
                      }`}
                    >
                      {p === "7d" ? "7 days" : p === "30d" ? "30 days" : "Term"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6 h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8A704C" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="#8A704C" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#141b4d" strokeOpacity={0.08} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#00000080" }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis tick={{ fontSize: 10, fill: "#00000055" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 4, border: "1px solid #d8d0c4", fontSize: 12, boxShadow: "0 8px 24px -12px rgba(20,27,77,.3)" }}
                      formatter={(value, name) => [`${value} kg`, name === "kg" ? "Deposited" : "Expected"]}
                    />
                    <Area type="monotone" dataKey="kg" stroke="#8A704C" strokeWidth={2.5} fill="url(#goldFill)" />
                    <Line type="monotone" dataKey="target" stroke="#141B4D" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-5 text-[11.5px] text-smu-muted">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-smu-gold" /> Deposited</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-2 bg-smu-navy" /> Expected</span>
                <Link href="/scan" className="ml-auto inline-flex items-center gap-1 font-semibold text-smu-gold-dark">
                  Scan a scale <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <aside className="flex flex-col overflow-hidden rounded-md bg-smu-navy text-white shadow-card lg:col-span-4">
              <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-smu-gold/20">
                  <Sparkles className="h-3.5 w-3.5 text-smu-gold-light" />
                </span>
                <div>
                  <p className="font-display text-[16px] uppercase tracking-[0.6px]">Operations insight</p>
                  <p className="text-[10.5px] text-white/40">Live operational insight</p>
                </div>
                <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[9.5px] uppercase tracking-[1px] text-white/60">Beta</span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-[14.5px] leading-6 text-white/85">{insights[insightIndex % insights.length]}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setInsightIndex((i) => i + 1)} className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-[11.5px] text-white/75 transition-colors hover:border-white/40 hover:text-white">
                    <RefreshCw className="h-3 w-3" /> Another insight
                  </button>
                </div>
                <p className="mt-auto border-t border-white/10 pt-4 text-[10.5px] text-white/40">
                  Based on bin telemetry, pantry history and the 7-day target.
                </p>
              </div>
            </aside>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
            <CleanerPanel bins={bins} cleaners={cleaners} initialBinId={selected.id} onDeposit={deposit} />
            <div className="flex flex-col gap-3">
              <h2 className="font-display text-[24px] leading-7 text-smu-navy">
                Collection queue <span className="font-sans text-[12px] font-normal text-smu-muted">{demoOn ? "· live" : "· sorted by urgency"}</span>
              </h2>
              <div id="pickups" className="scroll-mt-[120px]">
                <CollectionQueue bins={queue} etas={etas} onCollect={collect} onSelect={select} />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <PantryLeaderboard stats={pantryStats} />
            <LevelBreakdown binShort={selected.short} rows={breakdown} />
            <PantryWatch quiet={quiet} avgCaddy={avgCaddy} week={week} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <MonthlyChart currentTotalKg={repurposed} events={events} />
            <BuildingLeaderboard ranking={ranking(events)} bins={bins} />
            <ActivityFeed events={events} bins={bins} cleaners={cleaners} now={now} />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-black/10 bg-white px-5 py-4 text-[12px] text-smu-muted shadow-card">
            <span className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-smu-gold" />
              Cleaners check in at <Link href="/cleaner" className="font-semibold text-smu-gold underline underline-offset-2">the cleaner app</Link>.
            </span>
            <span>
              Weighing by hand? <Link href="/scan" className="font-semibold text-smu-gold underline underline-offset-2">Scan the scale</Link> or <Link href="/ocr" className="font-semibold text-smu-gold underline underline-offset-2">upload a scale photo</Link>.
            </span>
          </div>
        </div>
      </section>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
