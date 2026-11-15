"use client";

import { BarCompare, ChartCard, KpiCard } from "@/components/ui/chart-card";
import {
  change,
  dispenseTrend,
  dispensesIn,
  dispensesToday,
  previousWindow,
  recipeCounts,
  type Range,
  type Window,
} from "@/lib/analytics";
import type { ScrubDispense } from "@/lib/types";

const whole = (n: number) => String(Math.round(n));

/** Goal 5: how many people dispense a coffee scrub at the Grounds to Glow kiosk. */
export function ScrubSection({
  dispenses,
  range,
  window: w,
  rangeLabel,
  periodLabel,
  now,
}: {
  dispenses: ScrubDispense[];
  range: Range;
  window: Window;
  rangeLabel: string;
  periodLabel: string;
  now: number;
}) {
  const inRange = dispensesIn(dispenses, w);
  const before = dispensesIn(dispenses, previousWindow(range, now)).length;
  const today = dispensesToday(dispenses, now);
  const trend = dispenseTrend(dispenses, range, now);
  const recipes = recipeCounts(dispenses, w);
  const top = recipes[0];
  const max = top?.count ?? 0;

  return (
    <section aria-labelledby="scrub-heading">
      <h2 id="scrub-heading" className="font-display text-[26px] leading-8 text-smu-navy">
        Coffee scrubs dispensed
      </h2>
      <p className="text-[13px] text-smu-muted">
        {inRange.length} {inRange.length === 1 ? "person" : "people"} dispensed a coffee scrub at the
        Grounds to Glow kiosk in the last {rangeLabel.toLowerCase()}.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Scrubs dispensed"
          value={inRange.length}
          delta={change(inRange.length, before)}
          period={periodLabel}
          detail={`Last ${rangeLabel.toLowerCase()}`}
          trend={trend.map((p) => p.dispensed)}
        />
        <KpiCard label="Today" value={today} detail="Since midnight" />
        <KpiCard
          label="Most chosen recipe"
          value={top && top.count > 0 ? top.label : "None yet"}
          detail={top && top.count > 0 ? `${top.count} of ${inRange.length} scrubs` : `No scrubs in the last ${rangeLabel.toLowerCase()}`}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ChartCard
          title="Scrubs dispensed"
          subtitle={`${range === "term" ? "Per week" : "Per day"} · ${rangeLabel}`}
          className="content-start lg:col-span-7"
        >
          <BarCompare
            data={trend}
            xKey="label"
            series={[{ key: "dispensed", label: "Scrubs dispensed", slot: 1 }]}
            format={whole}
            height={240}
            description={`Number of coffee scrubs dispensed at the kiosk, ${range === "term" ? "per week" : "per day"}, over the last ${rangeLabel.toLowerCase()}.`}
          />
        </ChartCard>

        <ChartCard
          title="Recipes chosen"
          subtitle={`Share of scrubs · ${rangeLabel}`}
          className="content-start lg:col-span-5"
        >
          {inRange.length === 0 ? (
            <p className="rounded-[10px] bg-accent px-4 py-6 text-center text-[13px] text-muted-foreground">
              No scrubs dispensed in this range yet.
            </p>
          ) : (
            <ol className="grid gap-3">
              {recipes.map((r) => (
                <li key={r.recipe} className="grid gap-1 text-[12.5px]">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-semibold text-smu-navy">{r.label}</span>
                    <span className="tabular-nums">
                      <span className="font-medium">{r.count}</span>
                      <span className="ml-2 text-muted-foreground">
                        {Math.round((r.count / inRange.length) * 100)}%
                      </span>
                    </span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-black/6" aria-hidden>
                    <span
                      className="block h-full rounded-full bg-[var(--chart-1)]"
                      style={{ width: `${max ? (r.count / max) * 100 : 0}%` }}
                    />
                  </span>
                </li>
              ))}
            </ol>
          )}
        </ChartCard>
      </div>
    </section>
  );
}
