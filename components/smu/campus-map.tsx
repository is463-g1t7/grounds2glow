"use client";

import Image from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Check } from "lucide-react";
import { statusFor } from "@/lib/bins";
import { weight } from "@/lib/format";
import type { Bin } from "@/lib/types";

type Offset = { x: number; y: number };

/**
 * Pin positions as % of the full illustration. `narrow` nudges close pins apart on small screens;
 * `wide` does the same for the large pins on laptop screens.
 */
const PINS: Record<string, { x: number; y: number; narrow?: Offset; wide?: Offset }> = {
  "bin-soa": { x: 39, y: 53 },
  "bin-soe": { x: 35, y: 17, narrow: { x: -20, y: 0 }, wide: { x: -30, y: -8 } },
  "bin-scis": { x: 38, y: 21, narrow: { x: 16, y: 6 }, wide: { x: 30, y: 10 } },
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

const PIN_BG: Record<string, string> = { ok: "#3EB33E", near: "#E6A422", full: "#D93C36" };

const LABEL: Record<string, string> = { ok: "OK", near: "Near full", full: "Full" };

export function CampusMap({
  bins,
  selectedId,
  dimmedIds,
  onSelect,
  variant = "compact",
  hereId,
  caption,
}: {
  bins: Bin[];
  selectedId: string;
  dimmedIds: Set<string>;
  onSelect: (id: string) => void;
  /** `large` shows the whole illustration with big pins and no hover cards, for picking a place. */
  variant?: "compact" | "large";
  /** Marks this bin "You are here", for a laptop set up at that bin. */
  hereId?: string | null;
  caption?: ReactNode;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const large = variant === "large";
  return (
    <figure className="overflow-hidden rounded-md border border-black/10 bg-white">
      <div className={`relative overflow-hidden ${large ? "" : "md:aspect-[1024/403]"}`}>
        <div className={`relative ${large ? "" : "md:-translate-y-[14%]"}`}>
          <Image
            src="/images/smu-campus-map.jpeg"
            alt="Illustrated map of the SMU campus"
            width={1024}
            height={671}
            sizes="(min-width: 1024px) 60vw, 100vw"
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

            if (large) {
              const here = b.id === hereId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelect(b.id)}
                  aria-label={`${b.name}${here ? ", this station" : ""}, bin ${LABEL[s].toLowerCase()}`}
                  aria-pressed={selected}
                  className={`campus-pin-lg absolute flex min-h-9 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-bold text-white shadow-[0_4px_10px_-2px_rgb(0_0_0/0.45)] transition-transform hover:scale-110 lg:min-h-11 lg:px-3.5 lg:text-[16px] ${
                    selected ? "z-[5] scale-110" : "z-[1]"
                  } ${dim && !selected ? "opacity-25 saturate-0" : ""}`}
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    backgroundColor: PIN_BG[s],
                    ...(p.narrow
                      ? ({ "--nx": `${p.narrow.x}px`, "--ny": `${p.narrow.y}px` } as CSSProperties)
                      : undefined),
                    ...(p.wide
                      ? ({ "--wx": `${p.wide.x}px`, "--wy": `${p.wide.y}px` } as CSSProperties)
                      : undefined),
                    ...(selected ? { boxShadow: "0 0 0 3px #fff, 0 0 0 6px #8A704C" } : undefined),
                  }}
                >
                  {selected && <Check className="h-4 w-4" strokeWidth={3} />}
                  {b.short}
                  {here && (
                    <span className="pointer-events-none absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 rounded bg-smu-navy px-2 py-0.5 text-[13px] font-semibold text-white shadow-md lg:block">
                      You are here
                    </span>
                  )}
                </button>
              );
            }

            return (
              <div key={b.id}>
                <button
                  type="button"
                  onClick={() => onSelect(b.id)}
                  onMouseEnter={() => setHoveredId(b.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(b.id)}
                  onBlur={() => setHoveredId(null)}
                  aria-label={`${b.name}, ${weight(b.weightKg)}`}
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
                    backgroundColor: PIN_BG[s],
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
                        {weight(b.weightKg)}
                      </span>
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
      <figcaption
        className={`border-t border-black/8 bg-smu-cream/60 px-4 py-2 text-smu-muted ${
          large ? "text-[14px] leading-5" : "text-[11px]"
        }`}
      >
        {caption ?? (
          <>
            Campus art: SMU Sustainability Office · pins show live fill — green OK, amber near-full,
            red full. Hover a pin for its reading.
          </>
        )}
      </figcaption>
    </figure>
  );
}
