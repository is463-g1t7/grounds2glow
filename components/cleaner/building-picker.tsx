"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Truck } from "lucide-react";
import { CampusMap } from "@/components/smu/campus-map";
import { ago } from "@/lib/analytics";
import { levelsFor, statusFor } from "@/lib/bins";
import { weight } from "@/lib/format";
import { setStation, useDemoMode, useStation } from "@/lib/client/station";
import { apiRequest, useBootstrap } from "@/lib/client/use-bootstrap";
import { useNow } from "@/lib/client/use-now";
import type { Bin, BinEvent, BinStatus, Cleaner } from "@/lib/types";
import { CleanerShell, LoadingPanel, NeedsPass } from "./cleaner-shell";

const NO_DIM = new Set<string>();

const STATUS_TEXT: Record<BinStatus, string> = {
  ok: "Has room",
  near: "Nearly full",
  full: "Full · swap first",
};

const STATUS_DOT: Record<BinStatus, string> = {
  ok: "bg-smu-success",
  near: "bg-smu-warning",
  full: "bg-smu-danger",
};

export function BuildingPicker() {
  const params = useSearchParams();
  const { data, loading, refresh } = useBootstrap();
  const station = useStation();
  const demo = useDemoMode();
  const cleaner = data.cleaners.find((c) => c.id === params.get("cleaner"));
  const stationBin = data.bins.find((b) => b.id === station) ?? null;
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <CleanerShell step={2}>
        <LoadingPanel label="Loading pantries…" />
      </CleanerShell>
    );
  }

  if (!cleaner) {
    return (
      <CleanerShell step={2}>
        <NeedsPass />
      </CleanerShell>
    );
  }

  // A laptop set up for one bin opens on that bin's levels; any building can still be picked.
  const activeId = listOpen ? null : (pickedId ?? stationBin?.id ?? null);
  const active = data.bins.find((b) => b.id === activeId) ?? null;

  function pick(id: string) {
    setPickedId(id);
    setListOpen(false);
    // On narrow screens the panel sits below the map, so bring the levels into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      window.setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return (
    <CleanerShell
      step={2}
      cleaner={cleaner}
      where={active ? `${active.short} central bin` : undefined}
    >
      <div className="grid flex-1 items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)] lg:gap-8">
        <div className="lg:sticky lg:top-6">
          <CampusMap
            variant="large"
            bins={data.bins}
            selectedId={activeId ?? ""}
            hereId={stationBin?.id}
            dimmedIds={NO_DIM}
            onSelect={pick}
            caption={
              <>
                Tap your building on the map or in the list. Pin colours show how full each bin
                is. <span className="text-black/50">Campus art: SMU Sustainability Office.</span>
              </>
            }
          />
        </div>

        <div ref={panelRef} className="scroll-mt-6">
          {active ? (
            <div key={active.id} className="fade-up flex flex-col gap-5">
              <button
                type="button"
                onClick={() => setListOpen(true)}
                className="cleaner-link text-[15px]"
              >
                <ArrowLeft className="h-4 w-4" /> All buildings
              </button>
              <LevelPicker
                bin={active}
                events={data.events}
                cleaner={cleaner}
                onSwapped={refresh}
                footer={
                  demo && active.id !== station ? (
                    <button
                      type="button"
                      onClick={() => setStation(active.id)}
                      className="rounded border border-dashed border-black/25 px-4 py-2.5 text-[15px] font-semibold text-black/75 hover:border-smu-navy hover:text-smu-navy"
                    >
                      Demo: set this laptop as the {active.short} station
                    </button>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="fade-up flex flex-col gap-4">
              <h1 className="font-display text-[34px] leading-[42px] text-smu-navy">
                Which building are you at?
              </h1>
              <ul className="flex flex-col gap-2" aria-label="Buildings">
                {data.bins.map((b) => {
                  const s = statusFor(b.weightKg, b.capacityKg);
                  return (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => pick(b.id)}
                        className="flex min-h-14 w-full items-center gap-3 rounded-md border border-black/10 bg-white px-4 py-2 text-left transition-colors hover:border-smu-navy/50"
                      >
                        <span className="w-16 shrink-0 font-display text-[20px] leading-6 text-smu-navy">
                          {b.short}
                        </span>
                        <span className="min-w-0 flex-1 text-[14px] leading-5 text-black/75">
                          {b.name}
                          {b.id === station && (
                            <span className="ml-1.5 whitespace-nowrap font-semibold text-smu-navy">
                              · You are here
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-[14px] text-black/75">
                          <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[s]}`} />
                          {STATUS_TEXT[s]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </CleanerShell>
  );
}

/** One big button per pantry level. Number keys pick a level too. */
function LevelPicker({
  bin,
  events,
  cleaner,
  onSwapped,
  footer,
}: {
  bin: Bin;
  events: BinEvent[];
  cleaner: Cleaner;
  onSwapped: () => Promise<unknown>;
  footer?: ReactNode;
}) {
  const router = useRouter();
  const now = useNow();
  const [swapping, setSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapped, setSwapped] = useState(false);
  const levels = levelsFor(bin);
  const status = statusFor(bin.weightKg, bin.capacityKg);
  const full = status === "full";
  const room = Math.max(0, bin.capacityKg - bin.weightKg);

  const go = useRef<(level: number) => void>(() => {});
  useEffect(() => {
    go.current = (level: number) => {
      if (full || level < 1 || level > levels) return;
      router.push(`/cleaner/weigh?cleaner=${cleaner.id}&bin=${bin.id}&level=${level}`);
    };
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1) go.current(n);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function lastDropOff(level: number): string | null {
    const e = events.find((x) => x.type === "deposit" && x.binId === bin.id && x.level === level);
    return e && now ? ago(e.at, now) : null;
  }

  async function swap() {
    setSwapping(true);
    setSwapError(null);
    try {
      await apiRequest("/api/collect", {
        method: "POST",
        body: JSON.stringify({ binId: bin.id, cleanerId: cleaner.id }),
      });
      await onSwapped();
      setSwapped(true);
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : "Couldn't log the swap. Try again.");
    } finally {
      setSwapping(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-[34px] leading-[42px] text-smu-navy">
          Which level are the grounds from?
        </h1>
        <p className="mt-1 text-[17px] text-black/75">
          <span className="font-semibold text-black">{bin.short}</span> · {bin.name}
        </p>
      </div>

      <BinFill bin={bin} />

      {full ? (
        <div className="flex flex-col gap-3 rounded-md border border-smu-danger/30 bg-white p-4">
          <div>
            <p className="text-[17px] font-semibold text-[#a52a25]">The {bin.short} bin is full</p>
            <p className="mt-1 text-[15px] leading-6 text-black/75">
              Swap in an empty bin before weighing new grounds.
            </p>
            {swapError && <p className="mt-2 text-[15px] text-[#a52a25]">{swapError}</p>}
          </div>
          <button
            type="button"
            onClick={() => void swap()}
            disabled={swapping}
            className="btn-smu btn-smu-gold h-12 px-5 disabled:opacity-60"
          >
            <Truck className="h-5 w-5" /> {swapping ? "Logging swap…" : "I've swapped in an empty bin"}
          </button>
        </div>
      ) : (
        status === "near" && (
          <p className="text-[16px] text-black/75">
            Nearly full: room for about {weight(room)} more.
          </p>
        )
      )}

      {swapped && !full && (
        <p
          role="status"
          className="rounded border border-smu-gold/40 bg-smu-cream-light px-4 py-3 text-[16px] leading-6 text-black/85"
        >
          Bin swapped. Put the empty bin on the scale and press <strong>Z/T</strong>, then add the
          grounds.
        </p>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2" aria-label="Pantry levels">
        {Array.from({ length: levels }, (_, i) => i + 1).map((level) => {
          const last = lastDropOff(level);
          return (
            <li key={level}>
              <button
                type="button"
                disabled={full}
                onClick={() => go.current(level)}
                className="group relative flex h-full min-h-24 w-full flex-col items-start justify-between gap-1 rounded-md border border-black/10 bg-white px-4 py-3 text-left shadow-card transition-[border-color,box-shadow] hover:border-smu-gold hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-black/10 disabled:hover:shadow-card"
              >
                <span className="font-display text-[32px] leading-10 text-smu-navy group-hover:text-smu-gold-dark">
                  Level {level}
                </span>
                <span className="text-[14px] leading-5 text-black/70">
                  {last ? `Last drop-off ${last}` : "No drop-offs yet"}
                </span>
                <kbd
                  aria-hidden
                  className="absolute right-3 top-3 hidden rounded border border-black/15 px-2 py-0.5 font-sans text-[13px] text-black/55 lg:block"
                >
                  {level}
                </kbd>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="hidden text-[15px] text-black/60 lg:block">
        Tip: press a number key to pick that level.
      </p>
      {footer}
    </div>
  );
}

function BinFill({ bin }: { bin: Bin }) {
  const s = statusFor(bin.weightKg, bin.capacityKg);
  const pct = Math.min(100, (bin.weightKg / bin.capacityKg) * 100);
  return (
    <div>
      <p className="flex items-baseline justify-between gap-3 text-[15px] text-black/75">
        <span>Bin now</span>
        <span>
          <span className="font-display text-[24px] tabular-nums text-smu-navy">
            {weight(bin.weightKg)}
          </span>{" "}
          of {weight(bin.capacityKg)} · {STATUS_TEXT[s].toLowerCase()}
        </span>
      </p>
      <div
        role="meter"
        aria-label={`${bin.short} bin fill`}
        aria-valuemin={0}
        aria-valuemax={bin.capacityKg}
        aria-valuenow={bin.weightKg}
        aria-valuetext={`${weight(bin.weightKg)} of ${weight(bin.capacityKg)}, ${STATUS_TEXT[s].toLowerCase()}`}
        className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-black/10"
      >
        <div className={`h-full rounded-full ${STATUS_DOT[s]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
