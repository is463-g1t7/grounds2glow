"use client";

import { useState, type CSSProperties } from "react";
import { statusFor } from "@/lib/bins";
import type { Bin } from "@/lib/types";

const PINS: Record<string, { x: number; y: number; narrow?: { x: number; y: number } }> = {
  "bin-soa": { x: 39, y: 53 },
  "bin-soe": { x: 35, y: 17, narrow: { x: -20, y: 0 } },
  "bin-scis": { x: 38, y: 21, narrow: { x: 16, y: 6 } },
  "bin-yphsl": { x: 26, y: 67, narrow: { x: 6, y: 5 } },
  "bin-soss": { x: 15, y: 59, narrow: { x: -6, y: -5 } },
  "bin-lib": { x: 54, y: 38 },
  "bin-lkcsb": { x: 63, y: 62 },
};

const DOT: Record<string, string> = {
  ok: "bg-smu-success",
  near: "bg-smu-warning",
  full: "bg-smu-danger",
};

const LABEL: Record<string, string> = { ok: "OK", near: "Near full", full: "Full" };

export function CampusMap({
  bins,
  selectedId,
  dimmedIds,
  onSelect,
}: {
  bins: Bin[];
  selectedId: string;
  dimmedIds: Set<string>;
  onSelect: (id: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  return (
    <figure className="overflow-hidden rounded-md border border-black/10 bg-white">
      <div className="relative overflow-hidden md:aspect-[1024/403]">
        <div className="relative md:-translate-y-[14%]">
          <img
            src="/images/smu-campus-map.jpeg"
            alt="Illustrated map of the SMU campus"
            className="block h-auto w-full"
          />
          {bins.map((b) => {
            const p = PINS[b.id];
            if (!p) return null;
            const s = statusFor(b.weightKg, b.capacityKg);
            const selected = b.id === selectedId;
            const dim = dimmedIds.has(b.id);
            const pct = Math.min(100, (b.weightKg / b.capacityKg) * 100);
            const tx = p.x > 78 ? "-85%" : p.x < 22 ? "-15%" : "-50%";
            const ty = p.y < 36 ? "18px" : "calc(-100% - 18px)";
            return (
              <div key={b.id}>
                <button
                  type="button"
                  onClick={() => onSelect(b.id)}
                  onMouseEnter={() => setHoveredId(b.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(b.id)}
                  onBlur={() => setHoveredId(null)}
                  aria-label={`${b.name}, ${b.weightKg.toFixed(2)} kilograms`}
                  aria-pressed={selected}
                  className={`campus-pin absolute rounded-full px-2 py-1 text-[10.5px] font-bold text-white shadow-md transition hover:scale-110 ${
                    selected ? "z-[5] animate-pulse" : ""
                  } ${dim && !selected ? "opacity-25 saturate-0" : ""}`}
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    ...(p.narrow
                      ? ({ "--nx": `${p.narrow.x}px`, "--ny": `${p.narrow.y}px` } as CSSProperties)
                      : undefined),
                    backgroundColor:
                      s === "full" ? "#D93C36" : s === "near" ? "#E6A422" : "#3EB33E",
                    ...(selected ? { boxShadow: "0 0 0 3px #fff, 0 0 0 6px #8A704C" } : undefined),
                  }}
                >
                  {b.short}
                </button>
                {hoveredId === b.id && (
                  <div
                    className="pointer-events-none absolute z-10 w-48 rounded-md border border-black/10 bg-white p-3 shadow-xl"
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      transform: `translate(${tx}, ${ty})`,
                    }}
                  >
                    <p className="text-[12px] font-semibold leading-tight text-smu-navy">
                      {b.name} <span className="font-normal text-smu-muted">({b.short})</span>
                    </p>
                    <p className="text-[11px] text-smu-muted">{b.pantry}</p>
                    <p className="mt-1 flex items-baseline gap-1">
                      <span className="font-display text-[20px] leading-6 text-smu-navy">
                        {b.weightKg.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-smu-muted">kg</span>
                      <span className={`ml-auto h-2 w-2 rounded-full ${DOT[s]}`} />
                      <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-smu-muted">
                        {LABEL[s]}
                      </span>
                    </p>
                    <div className="mt-1.5 h-0.5 overflow-hidden bg-black/10">
                      <div
                        className={`h-full ${DOT[s]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] text-black/40">Click pin to inspect →</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <figcaption className="border-t border-black/8 bg-smu-cream/60 px-4 py-2 text-[11px] text-smu-muted">
        Campus art: SMU Sustainability Office · pins show live fill — green OK, amber near-full,
        red full. Hover a pin for its reading.
      </figcaption>
    </figure>
  );
}
