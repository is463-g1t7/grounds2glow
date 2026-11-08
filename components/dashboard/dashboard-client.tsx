"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, ChevronDown, Download, Pause, Play, RefreshCw, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/smu/page-chrome";
import { Toast } from "@/components/smu/toast";
import { CampusMap } from "@/components/smu/campus-map";
import { KpiCard } from "@/components/ui/chart-card";
import { CollectConfirm, CollectionStatus } from "@/components/dashboard/collection-status";
import { BuildingDrilldown } from "@/components/dashboard/building-drilldown";
import { ProductionSection } from "@/components/dashboard/production-section";
import { RepurposedSection } from "@/components/dashboard/repurposed-section";
import {
  RANGES,
  change,
  etaText,
  pantriesByKg,
  previousWindow,
  sumKg,
  trendSeries,
  velocityKgPerDay,
  windowFor,
  type Range,
} from "@/lib/analytics";
import { COLLECTOR_LABEL, collectorOf, statusFor } from "@/lib/bins";
import { downloadCsv } from "@/lib/client/csv";
import { demoControlsEnabled } from "@/lib/demo-controls";
import { kg } from "@/lib/format";
import { apiRequest, useBootstrap } from "@/lib/client/use-bootstrap";
import { useNow } from "@/lib/client/use-now";
import { cn } from "@/lib/utils";
import type { BinEvent, BootstrapData } from "@/lib/types";

const NO_DIMMED = new Set<string>();
const DEMO_ITEM =
  "flex items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[13px] font-medium text-smu-navy hover:bg-accent";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-smu-cream pt-[160px]">
      <div className="container-smu pb-24">
        <p className="display-h1 text-black">Live operations</p>
        {children}
      </div>
    </div>
  );
}

export function DashboardClient() {
  const data = useBootstrap(4000);
  const params = useSearchParams();
  const [selectedId, setSelectedId] = useState(() => params.get("bin") ?? "bin-soe");
  const [range, setRange] = useState<Range>("7d");
  const [demoOn, setDemoOn] = useState(false);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const seenEvents = useRef<Set<string> | null>(null);
  // Stable, so the 4-second poll re-rendering the page does not restart the toast's timer.
  const closeToast = useCallback(() => setToast(null), []);

  const { bins, events, cleaners } = data.data;
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
      (e) => e.type === "deposit" && (e.source === "ocr" || e.source === "reference" || e.source === "manual") && e.cleanerId
    );
    if (!live) return;
    const who = cleaners.find((c) => c.id === live.cleanerId)?.name ?? "A cleaner";
    setLiveId(live.id);
    setSelectedId(live.binId);
    setToast(`Live drop-off: ${who} emptied ${live.pantry} (+${kg(live.kg)}).`);
  }, [events, cleaners]);

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

  const etas = useMemo(
    () =>
      new Map(
        bins.map((b) => [b.id, etaText(b.weightKg, velocityKgPerDay(events, b.id, now), b.capacityKg)] as const)
      ),
    [bins, events, now]
  );

  const w = windowFor(range, now);
  const prev = previousWindow(range, now);
  const { label: rangeLabel, previous: periodLabel } = RANGES[range];

  const full = bins.filter((b) => statusFor(b.weightKg, b.capacityKg) === "full").length;
  const near = bins.filter((b) => statusFor(b.weightKg, b.capacityKg) === "near").length;
  const pantryLevels = bins.reduce((s, b) => s + b.levels, 0);
  const repurposed = sumKg(events, w, "collect");
  const deposited = sumKg(events, w, "deposit");
  const repurposedDelta = change(repurposed, sumKg(events, prev, "collect"));
  const depositedDelta = change(deposited, sumKg(events, prev, "deposit"));
  const spark = useMemo(() => trendSeries(events, range, now).map((p) => p.deposited), [events, range, now]);
  const shortOf = (id: string) => bins.find((b) => b.id === id)?.short ?? id;
  const topPantry = pantriesByKg(events, shortOf, w)[0];

  if (data.loading) {
    return (
      <Shell>
        <p className="mt-3 text-[18px] text-smu-muted">Loading bin telemetry…</p>
      </Shell>
    );
  }

  const selected = bins.find((b) => b.id === selectedId) ?? bins[0];
  if (!selected) {
    return (
      <Shell>
        <p className="mt-3 text-[18px] text-smu-muted">No bins found. Run the database seed script to load the demo data.</p>
        {data.error && <p className="mt-2 text-sm text-smu-danger">{data.error}</p>}
      </Shell>
    );
  }

  function inspect(id: string) {
    setSelectedId(id);
    window.requestAnimationFrame(() =>
      document.getElementById("building")?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
  }

  async function collect(id: string) {
    setConfirmId(null);
    const b = bins.find((x) => x.id === id);
    if (!b || b.weightKg <= 0) return;
    try {
      await apiRequest("/api/collect", { method: "POST", body: JSON.stringify({ binId: id }) });
      await data.refresh();
      setToast(`${b.short}: ${kg(b.weightKg)} logged as repurposed by ${COLLECTOR_LABEL}.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to collect bin.");
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
    setLiveId(null);
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
    const name = (e: BinEvent) => cleaners.find((c) => c.id === e.cleanerId)?.name ?? "";
    downloadCsv("smu-circular-coffee-report.csv", [
      ["bin", "building", "school", "weight_kg", "capacity_kg", "status", "updated_at"],
      ...bins.map((b) => [b.id, b.name, b.short, b.weightKg.toFixed(3), b.capacityKg, statusFor(b.weightKg, b.capacityKg), b.updatedAt]),
      [],
      ["time", "bin", "type", "level", "cleaner", "collected_by", "kg", "before_kg", "after_kg", "source"],
      ...events.map((e) => [
        e.at,
        e.binId,
        e.type,
        e.level != null ? `L${e.level}` : "",
        e.type === "deposit" ? name(e) : "",
        e.type === "collect" ? collectorOf(e) : "",
        e.kg.toFixed(3),
        e.beforeKg?.toFixed(3) ?? "",
        e.afterKg?.toFixed(3) ?? "",
        e.source ?? "",
      ]),
    ]);
    setToast("Dashboard report exported as CSV.");
  }

  return (
    <>
      <PageHeader
        title="Live operations"
        lead={`Which bins need collecting, where the grounds come from and who repurposed them, across ${bins.length} buildings and ${pantryLevels} pantry levels.`}
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
            <Link href="/cleaner" target="_blank" rel="noreferrer" className="btn-smu btn-smu-outline btn-smu-sm">
              Cleaner app <ArrowUpRight className="h-4 w-4" />
            </Link>
            {demoControlsEnabled && (
              <details className="group relative">
                <summary className="btn-smu btn-smu-outline btn-smu-sm list-none [&::-webkit-details-marker]:hidden">
                  Demo <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="absolute right-0 z-20 mt-2 grid w-56 gap-1 rounded-[14px] bg-card p-1.5 shadow-lift ring-1 ring-border">
                  <button type="button" onClick={() => setDemoOn((v) => !v)} className={DEMO_ITEM}>
                    {demoOn ? <Pause className="h-4 w-4 shrink-0" aria-hidden /> : <Play className="h-4 w-4 shrink-0" aria-hidden />}
                    {demoOn ? "Pause live day" : "Simulate live day"}
                  </button>
                  <button type="button" onClick={syncFromServer} className={DEMO_ITEM}>
                    <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
                    Sync a scale reading{syncedAt ? ` · ${syncedAt}` : ""}
                  </button>
                  <button type="button" onClick={resetDemo} className={DEMO_ITEM}>
                    <RotateCcw className="h-4 w-4 shrink-0" aria-hidden /> Reset demo data
                  </button>
                </div>
              </details>
            )}
          </>
        }
      />

      <section className="bg-smu-cream pb-20 pt-2 md:pb-24">
        <div className="container-smu grid grid-cols-1 gap-10">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-smu-muted">
                Charts and totals cover the last <span className="font-semibold text-black">{rangeLabel.toLowerCase()}</span>. Bin fill is live.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-full bg-white p-1 ring-1 ring-border" role="group" aria-label="Date range">
                  {(Object.keys(RANGES) as Range[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRange(r)}
                      aria-pressed={range === r}
                      className={cn(
                        "rounded-full px-3 py-1 text-[12px] font-semibold transition-colors",
                        range === r ? "bg-smu-navy text-white" : "text-smu-navy hover:bg-accent"
                      )}
                    >
                      {RANGES[r].label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={exportReport}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-smu-navy ring-1 ring-border transition-colors hover:bg-accent"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden /> Export report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Bins needing collection"
                value={`${full + near} / ${bins.length}`}
                detail={full + near ? `${full} full · ${near} near full` : "Every bin is below 80%"}
              />
              <KpiCard
                label={`Repurposed · ${rangeLabel}`}
                value={kg(repurposed)}
                delta={repurposedDelta}
                period={periodLabel}
                detail={`Collected by ${COLLECTOR_LABEL}`}
              />
              <KpiCard
                label={`Dropped off · ${rangeLabel}`}
                value={kg(deposited)}
                delta={depositedDelta}
                period={periodLabel}
                detail={`Across ${pantryLevels} pantry levels`}
                trend={spark}
              />
              <KpiCard
                label={`Top pantry · ${rangeLabel}`}
                value={topPantry?.pantry ?? "—"}
                detail={topPantry ? `${kg(topPantry.kg)} from ${topPantry.count} drop-offs` : "No drop-offs yet"}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
              <div className="min-w-0 lg:col-span-8">
                <CampusMap bins={bins} selectedId={selected.id} dimmedIds={NO_DIMMED} onSelect={inspect} />
              </div>
              <div className="min-w-0 lg:col-span-4">
                <CollectionStatus
                  bins={bins}
                  selectedId={selected.id}
                  etas={etas}
                  now={now}
                  onSelect={inspect}
                  onCollect={setConfirmId}
                />
              </div>
            </div>
          </div>

          <BuildingDrilldown
            bins={bins}
            bin={selected}
            events={events}
            cleaners={cleaners}
            window={w}
            rangeLabel={rangeLabel}
            now={now}
            highlightId={liveId}
            onSelect={setSelectedId}
          />

          <ProductionSection
            bins={bins}
            events={events}
            window={w}
            rangeLabel={rangeLabel}
            selectedId={selected.id}
            onSelect={inspect}
          />

          <RepurposedSection bins={bins} events={events} range={range} window={w} rangeLabel={rangeLabel} now={now} />
        </div>
      </section>

      <CollectConfirm bin={bins.find((b) => b.id === confirmId) ?? null} onConfirm={collect} onCancel={() => setConfirmId(null)} />
      {toast && <Toast message={toast} onClose={closeToast} />}
    </>
  );
}
