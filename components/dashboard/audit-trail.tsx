"use client";

import { useState } from "react";
import { Download, Recycle } from "lucide-react";
import { ChartCard } from "@/components/ui/chart-card";
import { ago, eventsIn, type Window } from "@/lib/analytics";
import { collectorOf, levelsFor } from "@/lib/bins";
import { downloadCsv } from "@/lib/client/csv";
import { cn } from "@/lib/utils";
import type { Bin, BinEvent, Cleaner, EventSource } from "@/lib/types";

const SOURCE: Record<EventSource, [string, string]> = {
  ocr: ["Scale OCR", "bg-smu-success/10 text-[#287a28]"],
  reference: ["OCR fallback", "bg-smu-warning/15 text-[#8a6209]"],
  manual: ["Manual", "bg-black/5 text-smu-muted"],
  demo: ["Demo sim", "bg-black/5 text-smu-muted"],
};

const PAGE = 8;

export function stamp(iso: string): string {
  return new Date(iso).toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const select =
  "h-8 rounded-[8px] border border-border bg-white px-2 text-[12px] focus:border-smu-gold focus:outline-none";

/** Goal 2: per-building chain of custody — which cleaner emptied which level, and who took it away. */
export function AuditTrail({
  bin,
  events,
  cleaners,
  window: w,
  rangeLabel,
  now,
  highlightId,
}: {
  bin: Bin;
  events: BinEvent[];
  cleaners: Cleaner[];
  window: Window;
  rangeLabel: string;
  now: number;
  highlightId: string | null;
}) {
  const [cleanerId, setCleanerId] = useState("all");
  const [level, setLevel] = useState("all");
  const [type, setType] = useState<"all" | BinEvent["type"]>("all");
  const [expanded, setExpanded] = useState(false);

  // Cleaner and level describe a drop-off, so either filter hides collections.
  const rows = eventsIn(events, w)
    .filter((e) => e.binId === bin.id)
    .filter((e) => type === "all" || e.type === type)
    .filter((e) => cleanerId === "all" || (e.type === "deposit" && e.cleanerId === cleanerId))
    .filter((e) => level === "all" || (e.type === "deposit" && String(e.level) === level))
    .sort((a, b) => (a.at < b.at ? 1 : -1));
  const shown = expanded ? rows : rows.slice(0, PAGE);
  const deposited = rows.filter((e) => e.type === "deposit").reduce((s, e) => s + e.kg, 0);
  const collected = rows.filter((e) => e.type === "collect").reduce((s, e) => s + e.kg, 0);
  const cleanerOf = (e: BinEvent) => cleaners.find((c) => c.id === e.cleanerId);

  function exportCsv() {
    downloadCsv(`${bin.short.toLowerCase()}-audit-trail.csv`, [
      ["time", "building", "action", "level", "cleaner", "pass", "collected_by", "kg", "bin_before_kg", "bin_after_kg", "source", "photo"],
      ...rows.map((e) => {
        const c = cleanerOf(e);
        const collect = e.type === "collect";
        return [
          e.at,
          bin.short,
          e.type,
          e.level != null ? `L${e.level}` : "",
          collect ? "" : (c?.name ?? ""),
          collect ? "" : (c?.pass ?? ""),
          collect ? collectorOf(e) : "",
          e.kg.toFixed(2),
          e.beforeKg?.toFixed(2) ?? "",
          e.afterKg?.toFixed(2) ?? "",
          e.source ?? "",
          e.photo ?? "",
        ];
      }),
    ]);
  }

  return (
    <ChartCard
      title={`${bin.short} audit trail`}
      subtitle={`Every drop-off signed by a cleaner pass · ${rangeLabel}`}
      className="min-w-0 content-start"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Filter by entry type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className={select}>
            <option value="all">All entries</option>
            <option value="deposit">Drop-offs</option>
            <option value="collect">Collections</option>
          </select>
          <select aria-label="Filter by cleaner" value={cleanerId} onChange={(e) => setCleanerId(e.target.value)} className={select}>
            <option value="all">All cleaners</option>
            {cleaners.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select aria-label="Filter by pantry level" value={level} onChange={(e) => setLevel(e.target.value)} className={select}>
            <option value="all">All levels</option>
            {Array.from({ length: levelsFor(bin) }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                L{i + 1}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!rows.length}
            className="inline-flex h-8 items-center gap-1.5 rounded-[8px] px-2.5 text-[12px] font-semibold text-smu-gold-dark ring-1 ring-border transition-colors hover:bg-accent disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" aria-hidden /> CSV
          </button>
        </div>
      }
    >
      {rows.length === 0 ? (
        <p className="rounded-[10px] bg-accent px-4 py-6 text-center text-[13px] text-muted-foreground">
          No entries match these filters in the last {rangeLabel.toLowerCase()}.
        </p>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <thead className="text-[11px] text-muted-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-3 font-medium">When</th>
                <th scope="col" className="py-2 pr-3 font-medium">Who</th>
                <th scope="col" className="py-2 pr-3 font-medium">Pantry</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Change</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Bin total</th>
                <th scope="col" className="py-2 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => {
                const c = cleanerOf(e);
                const collect = e.type === "collect";
                const src = e.source ? SOURCE[e.source] : null;
                return (
                  <tr
                    key={e.id}
                    className={cn(
                      "border-b border-border/60 last:border-0",
                      e.id === highlightId && "fade-up bg-smu-success/5",
                      collect && "bg-accent/50"
                    )}
                  >
                    <td className="py-2 pr-3 align-top">
                      <span className="block tabular-nums">{stamp(e.at)}</span>
                      <span className="text-[10.5px] text-muted-foreground">{ago(e.at, now)}</span>
                    </td>
                    <td className="py-2 pr-3 align-top">
                      {collect ? (
                        <span className="flex items-center gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-smu-gold text-white">
                            <Recycle className="h-3 w-3" aria-hidden />
                          </span>
                          <span className="leading-tight text-smu-navy">{collectorOf(e)}</span>
                        </span>
                      ) : c ? (
                        <span className="flex items-center gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-smu-navy text-[9px] font-bold text-white">
                            {c.initials}
                          </span>
                          <span>
                            <span className="block leading-tight text-smu-navy">{c.name}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">{c.pass}</span>
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unattributed</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 align-top font-medium text-smu-navy">
                      {collect ? "Bin collected" : e.level != null ? `L${e.level}` : (e.pantry ?? "—")}
                    </td>
                    <td className="py-2 pr-3 text-right align-top font-semibold tabular-nums">
                      {collect ? "−" : "+"}
                      {e.kg.toFixed(2)} kg
                    </td>
                    <td className="py-2 pr-3 text-right align-top tabular-nums text-muted-foreground">
                      {e.beforeKg != null && e.afterKg != null
                        ? `${e.beforeKg.toFixed(2)} → ${e.afterKg.toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="py-2 align-top">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {collect && <span className="rounded-full bg-smu-gold/10 px-2 py-0.5 text-[10px] font-medium text-smu-gold-dark">Repurposed</span>}
                        {src && <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", src[1])}>{src[0]}</span>}
                        {e.photo && (
                          <a href={e.photo} target="_blank" rel="noreferrer" className="text-[11px] text-smu-gold underline underline-offset-2">
                            scale photo
                          </a>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-muted-foreground">
        <span className="tabular-nums">
          {rows.length} entr{rows.length === 1 ? "y" : "ies"} · +{deposited.toFixed(2)} kg dropped off · −{collected.toFixed(2)} kg collected
        </span>
        {rows.length > PAGE && (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="font-semibold text-smu-gold-dark underline underline-offset-2">
            {expanded ? "Show fewer" : `Show all ${rows.length}`}
          </button>
        )}
      </div>
    </ChartCard>
  );
}
