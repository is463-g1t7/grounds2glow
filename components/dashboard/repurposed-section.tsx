"use client";

import { useState } from "react";
import { Recycle } from "lucide-react";
import { AreaTrend, BarCompare, ChartCard } from "@/components/ui/chart-card";
import { stamp } from "@/components/dashboard/audit-trail";
import { ago, eventsIn, kgByBuilding, trendSeries, type Range, type Window } from "@/lib/analytics";
import { collectorOf } from "@/lib/bins";
import { kg } from "@/lib/format";
import type { Bin, BinEvent } from "@/lib/types";

const PAGE = 6;

/** Goal 4: who collected the grounds, and how much was logged as repurposed. */
export function RepurposedSection({
  bins,
  events,
  range,
  window: w,
  rangeLabel,
  now,
}: {
  bins: Bin[];
  events: BinEvent[];
  range: Range;
  window: Window;
  rangeLabel: string;
  now: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const trend = trendSeries(events, range, now);
  const byBuilding = kgByBuilding(events, bins, w, "collect");
  const collections = eventsIn(events, w, "collect").sort((a, b) => (a.at < b.at ? 1 : -1));
  const total = collections.reduce((s, e) => s + e.kg, 0);
  const collectors = [...new Set(collections.map(collectorOf))];
  const shown = expanded ? collections : collections.slice(0, PAGE);
  const binOf = (id: string) => bins.find((b) => b.id === id);

  return (
    <section aria-labelledby="repurposed-heading">
      <h2 id="repurposed-heading" className="font-display text-[26px] leading-8 text-smu-navy">
        Repurposed grounds
      </h2>
      <p className="text-[13px] text-smu-muted">
        {kg(total)} collected in {collections.length} pickup{collections.length === 1 ? "" : "s"} in the last{" "}
        {rangeLabel.toLowerCase()}
        {collectors.length ? `, all by ${collectors.join(" and ")}` : ""}.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ChartCard
          title="Dropped off vs repurposed"
          subtitle={`${range === "term" ? "Weekly" : "Daily"} kilograms · ${rangeLabel}`}
          className="content-start lg:col-span-7"
        >
          <AreaTrend
            data={trend}
            xKey="label"
            series={[
              { key: "deposited", label: "Dropped off at pantries", slot: 1 },
              { key: "collected", label: "Collected and repurposed", slot: 2 },
            ]}
            format={kg}
            height={240}
            description={`${range === "term" ? "Weekly" : "Daily"} kilograms dropped off at pantries and collected for repurposing over the last ${rangeLabel.toLowerCase()}.`}
          />
        </ChartCard>

        <ChartCard
          title="Repurposed by building"
          subtitle={`Collected · ${rangeLabel} · heaviest first`}
          className="content-start lg:col-span-5"
        >
          <BarCompare
            data={byBuilding}
            xKey="short"
            series={[{ key: "kg", label: "Repurposed", slot: 2 }]}
            format={kg}
            height={240}
            description={`Kilograms of coffee grounds collected for repurposing per building over the last ${rangeLabel.toLowerCase()}.`}
          />
        </ChartCard>

        <ChartCard
          title="Collections log"
          subtitle="Each pickup is logged as repurposed grounds"
          className="min-w-0 content-start lg:col-span-12"
        >
          {collections.length === 0 ? (
            <p className="rounded-[10px] bg-accent px-4 py-6 text-center text-[13px] text-muted-foreground">
              No collections in the last {rangeLabel.toLowerCase()}.
            </p>
          ) : (
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[560px] text-left text-[12.5px]">
                <thead className="text-[11px] text-muted-foreground">
                  <tr className="border-b border-border">
                    <th scope="col" className="py-2 pr-3 font-medium">When</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Building</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Collected by</th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">Repurposed</th>
                    <th scope="col" className="py-2 text-right font-medium">Bin fill at pickup</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((e) => {
                    const b = binOf(e.binId);
                    return (
                      <tr key={e.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3 align-top">
                          <span className="block tabular-nums">{stamp(e.at)}</span>
                          <span className="text-[10.5px] text-muted-foreground">{ago(e.at, now)}</span>
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <span className="block font-semibold text-smu-navy">{b?.short ?? e.binId}</span>
                          <span className="text-[10.5px] text-muted-foreground">{b?.name}</span>
                        </td>
                        <td className="py-2 pr-3 align-top">
                          <span className="flex items-center gap-2">
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-smu-gold text-white">
                              <Recycle className="h-3 w-3" aria-hidden />
                            </span>
                            {collectorOf(e)}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right align-top font-semibold tabular-nums">{e.kg.toFixed(2)} kg</td>
                        <td className="py-2 text-right align-top tabular-nums text-muted-foreground">
                          {b ? `${Math.round((e.kg / b.capacityKg) * 100)}%` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {collections.length > PAGE && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="justify-self-start text-[11.5px] font-semibold text-smu-gold-dark underline underline-offset-2"
            >
              {expanded ? "Show fewer" : `Show all ${collections.length}`}
            </button>
          )}
        </ChartCard>
      </div>
    </section>
  );
}
