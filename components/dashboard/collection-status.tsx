"use client";

import { useEffect, useRef } from "react";
import { ChartCard } from "@/components/ui/chart-card";
import { ago } from "@/lib/analytics";
import { COLLECTOR_LABEL, statusFor } from "@/lib/bins";
import { cn } from "@/lib/utils";
import type { Bin, BinStatus } from "@/lib/types";

export const STATUS: Record<BinStatus, { label: string; dot: string; badge: string; rank: number }> = {
  full: { label: "Full", dot: "bg-smu-danger", badge: "bg-smu-danger/10 text-smu-danger", rank: 0 },
  near: { label: "Near full", dot: "bg-smu-warning", badge: "bg-smu-warning/15 text-[#8a6209]", rank: 1 },
  ok: { label: "OK", dot: "bg-smu-success", badge: "bg-smu-success/10 text-[#287a28]", rank: 2 },
};

/** Full first, then near full, then the rest; heaviest first within each. */
export function byUrgency(bins: Bin[]): Bin[] {
  return [...bins].sort((a, b) => {
    const d = STATUS[statusFor(a.weightKg, a.capacityKg)].rank - STATUS[statusFor(b.weightKg, b.capacityKg)].rank;
    return d || b.weightKg / b.capacityKg - a.weightKg / a.capacityKg;
  });
}

/** Goal 1: which of the seven building bins needs collecting now. */
export function CollectionStatus({
  bins,
  selectedId,
  etas,
  now,
  onSelect,
  onCollect,
}: {
  bins: Bin[];
  selectedId: string;
  etas: Map<string, string | null>;
  now: number;
  onSelect: (id: string) => void;
  onCollect: (id: string) => void;
}) {
  const sorted = byUrgency(bins);
  const full = bins.filter((b) => statusFor(b.weightKg, b.capacityKg) === "full").length;
  const near = bins.filter((b) => statusFor(b.weightKg, b.capacityKg) === "near").length;

  return (
    <ChartCard
      title="Collection status"
      subtitle={
        full + near
          ? `${full} full · ${near} near full · sorted by urgency`
          : "Every bin is below 80% · sorted by fill"
      }
      className="h-full content-start"
    >
      <ul className="grid gap-1.5">
        {sorted.map((b) => {
          const s = statusFor(b.weightKg, b.capacityKg);
          const pct = Math.min(100, (b.weightKg / b.capacityKg) * 100);
          const eta = etas.get(b.id);
          const selected = b.id === selectedId;
          return (
            <li
              key={b.id}
              className={cn(
                "flex items-center gap-2 rounded-[10px] px-2 py-1.5 transition-colors",
                selected ? "bg-accent ring-1 ring-border" : "hover:bg-accent/60"
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(b.id)}
                aria-pressed={selected}
                aria-label={`Inspect ${b.name}: ${b.weightKg.toFixed(1)} of ${b.capacityKg} kilograms, ${STATUS[s].label}`}
                className="grid min-w-0 flex-1 gap-1 text-left"
              >
                <span className="flex items-center gap-2 text-[12.5px]">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS[s].dot)} aria-hidden />
                  <span className="font-semibold text-smu-navy">{b.short}</span>
                  <span className={cn("rounded-full px-1.5 py-px text-[10px] font-semibold", STATUS[s].badge)}>
                    {STATUS[s].label}
                  </span>
                  <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                    <span className="font-medium text-black">{b.weightKg.toFixed(1)}</span> / {b.capacityKg} kg
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1 flex-1 overflow-hidden rounded-full bg-black/8" aria-hidden>
                    <span className={cn("block h-full rounded-full", STATUS[s].dot)} style={{ width: `${pct}%` }} />
                  </span>
                  <span className="shrink-0 text-[10.5px] text-muted-foreground">
                    {eta && eta !== "FULL" ? eta : `updated ${ago(b.updatedAt, now)}`}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => onCollect(b.id)}
                disabled={b.weightKg <= 0}
                className={cn(
                  "shrink-0 rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35",
                  s === "ok"
                    ? "text-smu-gold-dark hover:bg-white"
                    : "bg-smu-gold text-white hover:bg-smu-gold-dark"
                )}
              >
                Collect
              </button>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}

/** Confirms a collection before it is logged as repurposed by the student volunteer. */
export function CollectConfirm({
  bin,
  onConfirm,
  onCancel,
}: {
  bin: Bin | null;
  onConfirm: (id: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (bin && !dialog.open) dialog.showModal();
    if (!bin && dialog.open) dialog.close();
  }, [bin]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="collect-title"
      className="m-auto w-[min(420px,calc(100vw-32px))] rounded-[18px] bg-card p-0 text-card-foreground shadow-lift ring-1 ring-border backdrop:bg-smu-navy/40"
    >
      {bin && (
        <form
          method="dialog"
          className="grid gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm(bin.id);
          }}
        >
          <div className="grid gap-1">
            <h2 id="collect-title" className="text-[15px] font-semibold text-smu-navy">
              Log collection from {bin.short}?
            </h2>
            <p className="text-[13px] leading-5 text-muted-foreground">
              <span className="font-semibold tabular-nums text-black">{bin.weightKg.toFixed(2)} kg</span> from{" "}
              {bin.name} will be logged as repurposed grounds, collected by{" "}
              <span className="font-semibold text-black">{COLLECTOR_LABEL}</span>. The bin resets to 0 kg.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="btn-smu btn-smu-outline btn-smu-sm">
              Cancel
            </button>
            <button type="submit" autoFocus className="btn-smu btn-smu-gold btn-smu-sm">
              Log collection
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
