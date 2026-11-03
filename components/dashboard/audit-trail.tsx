"use client";

import { useState } from "react";
import { Download, UserRound } from "lucide-react";
import { ago } from "@/lib/analytics";
import type { Bin, BinEvent, Cleaner, EventSource } from "@/lib/types";
import { levelsFor } from "@/lib/bins";

const SOURCE: Record<EventSource, [string, string]> = {
  ocr: ["Scale OCR", "bg-smu-success/10 text-[#287a28]"],
  reference: ["OCR fallback", "bg-smu-warning/15 text-[#8a6209]"],
  manual: ["Manual", "bg-black/5 text-smu-muted"],
  demo: ["Demo sim", "bg-black/5 text-smu-muted"],
};

const PAGE = 8;

function stamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Per-building chain of custody: who emptied which pantry, and the bin total either side. */
export function AuditTrail({
  bin,
  events,
  cleaners,
  now,
  highlightId,
}: {
  bin: Bin;
  events: BinEvent[];
  cleaners: Cleaner[];
  now: number;
  highlightId: string | null;
}) {
  const [cleanerId, setCleanerId] = useState("all");
  const [level, setLevel] = useState("all");
  const [expanded, setExpanded] = useState(false);

  const rows = events.filter(
    (e) =>
      e.binId === bin.id &&
      (cleanerId === "all" || e.cleanerId === cleanerId) &&
      (level === "all" || (e.type === "deposit" && String(e.level) === level))
  );
  const shown = expanded ? rows : rows.slice(0, PAGE);
  const deposited = rows.filter((e) => e.type === "deposit").reduce((s, e) => s + e.kg, 0);

  function exportCsv() {
    const head = ["time", "building", "action", "pantry", "cleaner", "pass", "kg", "bin_before_kg", "bin_after_kg", "source", "photo"];
    const body = rows.map((e) => {
      const c = cleaners.find((item) => item.id === e.cleanerId);
      return [
        e.at,
        bin.short,
        e.type,
        e.pantry ?? "",
        c?.name ?? "",
        c?.pass ?? "",
        e.kg.toFixed(2),
        e.beforeKg?.toFixed(2) ?? "",
        e.afterKg?.toFixed(2) ?? "",
        e.source ?? "",
        e.photo ?? "",
      ];
    });
    const csv = [head, ...body]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bin.short.toLowerCase()}-audit-trail.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const select = "h-8 rounded border border-black/15 bg-white px-2 text-[11.5px] focus:border-smu-gold focus:outline-none";

  return (
    <section className="rounded-md border border-black/10 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[24px] leading-7 text-smu-navy">
            {bin.short} audit trail{" "}
            <span className="font-sans text-[12px] font-normal text-smu-muted">
              · central bin {bin.weightKg.toFixed(2)} / {bin.capacityKg} kg
            </span>
          </h2>
          <p className="mt-1 text-[12px] text-smu-muted">
            Every drop-off, signed by the cleaner&apos;s pass. Follows the selected bin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <button type="button" onClick={exportCsv} disabled={!rows.length} className="btn-smu btn-smu-outline btn-smu-sm disabled:opacity-40">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-[13px] text-smu-muted">No drop-offs match these filters yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[12.5px]">
            <thead className="text-[10px] uppercase tracking-[1px] text-black/40">
              <tr className="border-b border-black/10">
                <th className="py-2 pr-3 font-semibold">When</th>
                <th className="py-2 pr-3 font-semibold">Cleaner</th>
                <th className="py-2 pr-3 font-semibold">Pantry</th>
                <th className="py-2 pr-3 text-right font-semibold">Change</th>
                <th className="py-2 pr-3 text-right font-semibold">Bin total</th>
                <th className="py-2 font-semibold">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => {
                const c = cleaners.find((item) => item.id === e.cleanerId);
                const collect = e.type === "collect";
                const src = e.source ? SOURCE[e.source] : null;
                return (
                  <tr
                    key={e.id}
                    className={`border-b border-black/6 last:border-0 ${
                      e.id === highlightId ? "fade-up bg-smu-success/5" : ""
                    }`}
                  >
                    <td className="py-2 pr-3 align-top">
                      <span className="block tabular-nums">{stamp(e.at)}</span>
                      <span className="text-[10.5px] text-black/40">{ago(e.at, now)}</span>
                    </td>
                    <td className="py-2 pr-3 align-top">
                      {c ? (
                        <span className="flex items-center gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-smu-navy text-[9px] font-bold text-white">
                            {c.initials}
                          </span>
                          <span>
                            <span className="block leading-tight text-smu-navy">{c.name}</span>
                            <span className="font-mono text-[10px] text-black/40">{c.pass}</span>
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-black/40">
                          <UserRound className="h-3 w-3" /> {collect ? "Collection crew" : "Unattributed"}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 align-top">
                      {collect ? (
                        <span className="font-medium text-[#287a28]">✓ Bin collected</span>
                      ) : (
                        <span className="font-medium text-smu-navy">
                          {e.level != null ? `L${e.level} pantry` : (e.pantry ?? "—")}
                        </span>
                      )}
                    </td>
                    <td className={`py-2 pr-3 text-right align-top font-semibold tabular-nums ${collect ? "text-[#287a28]" : "text-smu-navy"}`}>
                      {collect ? "−" : "+"}
                      {e.kg.toFixed(2)} kg
                    </td>
                    <td className="py-2 pr-3 text-right align-top tabular-nums text-smu-muted">
                      {e.beforeKg != null && e.afterKg != null
                        ? `${e.beforeKg.toFixed(2)} → ${e.afterKg.toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="py-2 align-top">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {src && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${src[1]}`}>{src[0]}</span>}
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-smu-muted">
        <span>
          {rows.length} entr{rows.length === 1 ? "y" : "ies"} · {deposited.toFixed(2)} kg deposited
        </span>
        {rows.length > PAGE && (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="font-semibold text-smu-gold underline underline-offset-2">
            {expanded ? "Show fewer" : `Show all ${rows.length}`}
          </button>
        )}
      </div>
    </section>
  );
}
