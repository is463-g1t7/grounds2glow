"use client";

import type { KeyboardEvent } from "react";
import { levelsFor, statusFor } from "@/lib/bins";
import type { Bin } from "@/lib/types";

const DOT = { ok: "bg-smu-success", near: "bg-smu-warning", full: "bg-smu-danger" } as const;

export function BinSpotlight({
  bins,
  selectedId,
  dimmedIds,
  etas,
  topPantries,
  onSelect,
  onCollect,
}: {
  bins: Bin[];
  selectedId: string;
  dimmedIds: Set<string>;
  etas: Map<string, string | null>;
  topPantries: Map<string, string>;
  onSelect: (id: string) => void;
  onCollect: (id: string) => void;
}) {
  const bin = bins.find((b) => b.id === selectedId) ?? bins[0];
  const status = statusFor(bin.weightKg, bin.capacityKg);
  const pct = Math.min(100, (bin.weightKg / bin.capacityKg) * 100);
  const badge =
    status === "full"
      ? "bg-smu-danger/10 text-smu-danger"
      : status === "near"
        ? "bg-smu-warning/15 text-[#8a6209]"
        : "bg-smu-success/10 text-[#287a28]";
  const label = status === "full" ? "FULL" : status === "near" ? "Near full" : "OK";
  const bar =
    status === "full" ? "bg-smu-danger" : status === "near" ? "bg-smu-warning" : "bg-smu-success";
  const eta = etas.get(bin.id);
  const top = topPantries.get(bin.id);

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
    document.getElementById(`bin-tab-${bins[next].id}`)?.focus();
  }

  return (
    <section id="bin-spotlight" className="scroll-mt-24 overflow-hidden rounded-md border border-black/10 bg-white shadow-card">
      <div
        role="tablist"
        aria-label="Smart bins by building"
        onKeyDown={onKey}
        className="flex gap-1.5 overflow-x-auto border-b border-black/8 bg-smu-cream/40 p-2"
      >
        {bins.map((b) => {
          const on = b.id === bin.id;
          return (
            <button
              key={b.id}
              id={`bin-tab-${b.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls="bin-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => onSelect(b.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                on ? "bg-smu-navy text-white" : "hover:bg-smu-cream"
              } ${dimmedIds.has(b.id) && !on ? "opacity-40" : ""}`}
            >
              <span className={`h-2 w-2 rounded-full ${DOT[statusFor(b.weightKg, b.capacityKg)]}`} />
              {b.short}
              <span className={`text-[11px] tabular-nums ${on ? "text-white/65" : "text-smu-muted"}`}>
                {b.weightKg.toFixed(1)}
              </span>
            </button>
          );
        })}
      </div>

      <div
        key={bin.id}
        id="bin-panel"
        role="tabpanel"
        aria-labelledby={`bin-tab-${bin.id}`}
        className="fade-up grid gap-5 p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-8"
      >
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <h2 className="font-display text-[24px] leading-7 text-smu-navy">
              {bin.name} <span className="text-black/40">({bin.short})</span>
            </h2>
            <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${badge}`}>
              {label}
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-smu-muted">
            {bin.pantry} · {levelsFor(bin)} pantries
            {eta && eta !== "FULL" ? ` · ${eta}` : ""}
            {top ? ` · top ${top}` : ""}
          </p>
          <p className="mt-1 text-[11px] text-black/35">
            Updated {new Date(bin.updatedAt).toLocaleString()}
          </p>
        </div>

        <div>
          <p className="text-[13px]">
            <span className="font-display text-[32px] leading-9 tabular-nums text-smu-navy">
              {bin.weightKg.toFixed(2)}
            </span>{" "}
            <span className="text-smu-muted">kg / {bin.capacityKg} kg</span>
          </p>
          <div
            className="mt-2 h-0.5 overflow-hidden bg-black/10"
            role="progressbar"
            aria-label={`${bin.short} fill`}
            aria-valuenow={bin.weightKg}
            aria-valuemin={0}
            aria-valuemax={bin.capacityKg}
          >
            <div className={`h-full transition-[width] ${bar}`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onCollect(bin.id)}
          disabled={bin.weightKg <= 0}
          className="btn-smu btn-smu-gold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Mark collected
        </button>
      </div>
    </section>
  );
}
