"use client";

import { BarCompare, ChartCard } from "@/components/ui/chart-card";
import { kgByBuilding, pantriesByKg, type Window } from "@/lib/analytics";
import { kg } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Bin, BinEvent } from "@/lib/types";

const TOP = 8;

/** Goal 3: which buildings, and which levels within them, produce the most grounds. */
export function ProductionSection({
  bins,
  events,
  window: w,
  rangeLabel,
  selectedId,
  onSelect,
}: {
  bins: Bin[];
  events: BinEvent[];
  window: Window;
  rangeLabel: string;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const buildings = kgByBuilding(events, bins, w, "deposit");
  const shortOf = (id: string) => bins.find((b) => b.id === id)?.short ?? id;
  const pantries = pantriesByKg(events, shortOf, w).slice(0, TOP);
  const total = buildings.reduce((s, b) => s + b.kg, 0);
  const max = pantries[0]?.kg ?? 0;

  return (
    <section aria-labelledby="production-heading">
      <h2 id="production-heading" className="font-display text-[26px] leading-8 text-smu-navy">
        Where the grounds come from
      </h2>
      <p className="text-[13px] text-smu-muted">
        {kg(total)} dropped off across {bins.length} buildings in the last {rangeLabel.toLowerCase()}.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ChartCard
          title="Grounds by building"
          subtitle={`Dropped off · ${rangeLabel} · heaviest first`}
          className="content-start lg:col-span-7"
        >
          <BarCompare
            data={buildings}
            xKey="short"
            series={[{ key: "kg", label: "Dropped off", slot: 1 }]}
            format={kg}
            height={260}
            description={`Kilograms of coffee grounds dropped off per building over the last ${rangeLabel.toLowerCase()}.`}
          />
        </ChartCard>

        <ChartCard
          title="Top pantries"
          subtitle={`Building and level · ${rangeLabel}`}
          className="content-start lg:col-span-5"
        >
          {pantries.length === 0 ? (
            <p className="rounded-[10px] bg-accent px-4 py-6 text-center text-[13px] text-muted-foreground">
              No drop-offs in this range yet.
            </p>
          ) : (
            <ol className="grid gap-1">
              {pantries.map((p, i) => (
                <li key={`${p.binId}-${p.level}`}>
                  <button
                    type="button"
                    onClick={() => onSelect(p.binId)}
                    aria-label={`${p.pantry}: ${kg(p.kg)} from ${p.count} drop-offs. Inspect building.`}
                    className={cn(
                      "grid w-full grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-[10px] px-2 py-1.5 text-left text-[12.5px] transition-colors hover:bg-accent",
                      p.binId === selectedId && "bg-accent/70"
                    )}
                  >
                    <span className="text-[11px] tabular-nums text-muted-foreground">{i + 1}</span>
                    <span className="font-semibold text-smu-navy">{p.pantry}</span>
                    <span className="tabular-nums">
                      <span className="font-medium">{kg(p.kg)}</span>
                      <span className="ml-2 text-muted-foreground">{p.count} drops</span>
                    </span>
                    <span className="col-start-2 col-end-4 h-1 overflow-hidden rounded-full bg-black/6" aria-hidden>
                      <span className="block h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${max ? (p.kg / max) * 100 : 0}%` }} />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </ChartCard>
      </div>
    </section>
  );
}
