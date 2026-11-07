"use client";

import type { KeyboardEvent } from "react";
import { BarCompare, ChartCard } from "@/components/ui/chart-card";
import { AuditTrail } from "@/components/dashboard/audit-trail";
import { STATUS } from "@/components/dashboard/collection-status";
import { levelBreakdown, type Window } from "@/lib/analytics";
import { levelsFor, statusFor } from "@/lib/bins";
import { kg } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Bin, BinEvent, Cleaner } from "@/lib/types";

/** The selected building: which levels produce its grounds, and the signed log behind them. */
export function BuildingDrilldown({
  bins,
  bin,
  events,
  cleaners,
  window: w,
  rangeLabel,
  now,
  highlightId,
  onSelect,
}: {
  bins: Bin[];
  bin: Bin;
  events: BinEvent[];
  cleaners: Cleaner[];
  window: Window;
  rangeLabel: string;
  now: number;
  highlightId: string | null;
  onSelect: (id: string) => void;
}) {
  const levels = levelBreakdown(events, bin.id, levelsFor(bin), w);
  const busiest = [...levels].sort((a, b) => b.kg - a.kg)[0];
  const quiet = levels.filter((l) => l.count === 0).map((l) => l.level);
  const total = levels.reduce((s, l) => s + l.kg, 0);

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = bins.findIndex((b) => b.id === bin.id);
    const next =
      e.key === "ArrowRight"
        ? (i + 1) % bins.length
        : e.key === "ArrowLeft"
          ? (i - 1 + bins.length) % bins.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? bins.length - 1
              : null;
    if (next == null) return;
    e.preventDefault();
    onSelect(bins[next].id);
    document.getElementById(`building-tab-${bins[next].id}`)?.focus();
  }

  return (
    <section id="building" aria-labelledby="building-heading" className="scroll-mt-28">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="building-heading" className="font-display text-[26px] leading-8 text-smu-navy">
            {bin.name}
          </h2>
          <p className="text-[13px] text-smu-muted">
            <span className="font-semibold tabular-nums text-black">
              {bin.weightKg.toFixed(2)} / {bin.capacityKg} kg
            </span>{" "}
            in the central bin · {STATUS[statusFor(bin.weightKg, bin.capacityKg)].label} · {levelsFor(bin)} pantry levels
          </p>
        </div>
        <div role="tablist" aria-label="Building" onKeyDown={onKey} className="scrollbar-thin flex max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1 ring-1 ring-border">
          {bins.map((b) => {
            const on = b.id === bin.id;
            return (
              <button
                key={b.id}
                id={`building-tab-${b.id}`}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="building-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => onSelect(b.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-colors",
                  on ? "bg-smu-navy text-white" : "text-smu-navy hover:bg-accent"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS[statusFor(b.weightKg, b.capacityKg)].dot)} aria-hidden />
                {b.short}
              </button>
            );
          })}
        </div>
      </div>

      <div id="building-panel" role="tabpanel" aria-labelledby={`building-tab-${bin.id}`} className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ChartCard
          title={`${bin.short} grounds by pantry level`}
          subtitle={`${kg(total)} dropped off · ${rangeLabel}`}
          className="content-start lg:col-span-5"
        >
          <BarCompare
            data={levels}
            xKey="level"
            series={[{ key: "kg", label: "Dropped off", slot: 1 }]}
            format={kg}
            height={240}
            description={`Kilograms of coffee grounds dropped off per pantry level in ${bin.name} over the last ${rangeLabel.toLowerCase()}.`}
          />
          <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-[12px]">
            <div>
              <dt className="text-muted-foreground">Busiest level</dt>
              <dd className="mt-0.5 font-semibold text-smu-navy">
                {busiest && busiest.kg > 0 ? `${busiest.level} · ${kg(busiest.kg)} · ${busiest.count} drops` : "No drop-offs yet"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Quiet levels</dt>
              <dd className="mt-0.5 font-semibold text-smu-navy">{quiet.length ? quiet.join(", ") : "None, every level reported"}</dd>
            </div>
          </dl>
        </ChartCard>

        <div className="min-w-0 lg:col-span-7">
          <AuditTrail
            key={bin.id}
            bin={bin}
            events={events}
            cleaners={cleaners}
            window={w}
            rangeLabel={rangeLabel}
            now={now}
            highlightId={highlightId}
          />
        </div>
      </div>
    </section>
  );
}
