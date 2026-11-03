"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { CampusMap } from "@/components/smu/CampusMap";
import { ago } from "@/lib/analytics";
import { levelsFor, statusFor } from "@/lib/bins";
import { useBootstrap } from "@/lib/client/use-bootstrap";
import { SCALE_FRAMES } from "@/lib/scales";
import { CleanerShell, NeedsPass, StepColumns } from "./CleanerShell";

const NO_DIM = new Set<string>();
const MAX_FRAME_KG = Math.max(...SCALE_FRAMES.map((f) => f.refKg));

// ponytail: minute-granularity clock; per-second tick if "ago" labels need it
function useNow(stepMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), stepMs);
    return () => window.clearInterval(id);
  }, [stepMs]);
  return now;
}

export function BuildingPicker() {
  const router = useRouter();
  const params = useSearchParams();
  const { data, loading } = useBootstrap();
  const cleaner = data.cleaners.find((c) => c.id === params.get("cleaner"));
  const bins = data.bins;
  const events = data.events;
  const now = useNow();
  const [binId, setBinId] = useState<string | null>(null);
  const [level, setLevel] = useState<number | null>(null);

  if (loading) {
    return (
      <CleanerShell step={2}>
        <p className="rounded-md border border-black/10 bg-white p-5 text-[13px] text-smu-muted shadow-card">
          Loading bins…
        </p>
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

  const bin = bins.find((b) => b.id === binId) ?? null;

  function open(id: string) {
    setBinId(id);
    setLevel(null);
  }

  function lastEmptied(id: string, l: number): string | null {
    const e = events.find((x) => x.type === "deposit" && x.binId === id && x.level === l);
    return e ? ago(e.at, now) : null;
  }

  function confirm() {
    if (!bin || level == null || !cleaner) return;
    router.push(`/cleaner/weigh?cleaner=${cleaner.id}&bin=${bin.id}&level=${level}`);
  }

  const levelPanel = (titleId: string, onClose?: () => void) =>
    bin && (
      <>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-[11px] uppercase tracking-[2px] text-smu-gold">
              {bin.short}
            </p>
            <h2 id={titleId} className="font-display text-[26px] leading-8 text-smu-navy">
              Which pantry did the grounds come from?
            </h2>
            <p className="mt-1 text-[13px] text-smu-muted">
              {bin.name} · central bin at {bin.weightKg.toFixed(1)} kg
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-smu-muted transition-colors hover:bg-smu-cream hover:text-smu-navy"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {bin.weightKg >= MAX_FRAME_KG && (
          <p className="mt-3 rounded border border-smu-warning/30 bg-smu-warning/10 px-3 py-2 text-[13px] text-[#8a6209]">
            This bin is nearly full. You&apos;ll be asked to swap it before weighing.
          </p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          {Array.from({ length: levelsFor(bin) }, (_, i) => i + 1).map((l) => {
            const last = lastEmptied(bin.id, l);
            return (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                aria-pressed={level === l}
                className={`flex flex-col items-center rounded border px-2 py-3 transition-colors ${
                  level === l
                    ? "border-smu-gold bg-smu-gold text-white"
                    : "border-black/10 bg-white hover:bg-smu-cream"
                }`}
              >
                <span className="font-display text-[20px] leading-6">L{l}</span>
                <span className={`text-[10.5px] ${level === l ? "text-white/75" : "text-smu-muted"}`}>
                  {last ? `emptied ${last}` : "no record"}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={confirm}
          disabled={level == null}
          className="btn-smu btn-smu-gold mt-4 w-full disabled:opacity-40"
        >
          {level == null ? "Select a level" : `Confirm ${bin.short} · L${level} pantry →`}
        </button>
      </>
    );

  const buildingList = (
    <ul className="grid grid-cols-2 gap-2">
      {bins.map((b) => {
        const s = statusFor(b.weightKg, b.capacityKg);
        return (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => open(b.id)}
              className={`flex w-full flex-col rounded border bg-white px-3 py-2 text-left transition-colors ${
                b.id === binId
                  ? "border-smu-gold shadow-[0_0_0_2px_rgba(138,112,76,0.35)]"
                  : "border-black/10 hover:border-black/30"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold text-smu-navy">{b.short}</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    s === "full" ? "bg-smu-danger" : s === "near" ? "bg-smu-warning" : "bg-smu-success"
                  }`}
                />
              </span>
              <span className="truncate text-[11px] text-smu-muted">{b.name}</span>
              <span className="text-[11px] tabular-nums text-smu-muted">
                Bin {b.weightKg.toFixed(1)} / {b.capacityKg} kg
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <CleanerShell step={2} cleaner={cleaner}>
      <StepColumns
        main={
          <>
            <div>
              <h1 className="font-display text-[30px] leading-9 text-smu-navy">
                Which building are you at?
              </h1>
              <p className="text-[13px] text-smu-muted">Tap a pin on the map or pick from the list.</p>
            </div>

            <CampusMap bins={bins} selectedId={binId ?? ""} dimmedIds={NO_DIM} onSelect={open} />

            <div className="lg:hidden">{buildingList}</div>
          </>
        }
        side={
          // Laptop: buildings, then the level picker, sit beside the map instead of below/over it.
          <section className="hidden rounded-md border border-black/10 bg-white p-5 shadow-card lg:block">
            {bin ? (
              <div key={bin.id} className="fade-up">
                <div className="mb-4 flex flex-wrap gap-1.5" aria-label="Switch building">
                  {bins.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => open(b.id)}
                      aria-pressed={b.id === bin.id}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        b.id === bin.id
                          ? "bg-smu-navy text-white"
                          : "border border-black/10 text-smu-muted hover:bg-smu-cream"
                      }`}
                    >
                      {b.short}
                    </button>
                  ))}
                </div>
                {levelPanel("level-title-side")}
              </div>
            ) : (
              <>
                <h2 className="font-display text-[24px] leading-7 text-smu-navy">Pick a building</h2>
                <p className="mb-3 text-[13px] text-smu-muted">
                  Its pantry levels appear here, with when each was last emptied.
                </p>
                {buildingList}
              </>
            )}
          </section>
        }
      />

      {/* Phone: bottom sheet over the map. */}
      {bin && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-smu-navy-deep/50 p-0 sm:items-center sm:p-4 lg:hidden"
          onClick={() => setBinId(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="level-title"
            onClick={(e) => e.stopPropagation()}
            className="fade-up w-full max-w-md rounded-t-lg bg-white p-5 shadow-2xl sm:rounded-lg"
          >
            {levelPanel("level-title", () => setBinId(null))}
          </div>
        </div>
      )}
    </CleanerShell>
  );
}
