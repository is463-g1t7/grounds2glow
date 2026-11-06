"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, RefreshCw, Truck } from "lucide-react";
import { BoxOverlay } from "@/components/smu/box-overlay";
import { levelsFor, pantryLabel } from "@/lib/bins";
import { apiRequest, useBootstrap } from "@/lib/client/use-bootstrap";
import { demoControlsEnabled } from "@/lib/demo-controls";
import { runDemoOcr } from "@/lib/demo-ocr";
import type { OcrLine } from "@/lib/languages";
import { pickFrame, SCALE_LCD as LCD, type ScaleFrame } from "@/lib/scales";
import type { BinEvent } from "@/lib/types";
import { CleanerShell, NeedsPass, StepColumns } from "./cleaner-shell";

type Phase = "aligning" | "locked" | "captured" | "ocr" | "saved" | "rejected" | "failed" | "swap";

const FRAME_SIZE = { width: 2752, height: 1536 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function WeighStation() {
  const params = useSearchParams();
  const { data, loading, refresh } = useBootstrap();
  const cleaner = data.cleaners.find((c) => c.id === params.get("cleaner"));
  const bin = data.bins.find((b) => b.id === params.get("bin"));
  const level = Number(params.get("level"));
  const validLevel =
    bin != null && Number.isInteger(level) && level >= 1 && level <= levelsFor(bin);

  const [phase, setPhase] = useState<Phase>("aligning");
  const [frame, setFrame] = useState<ScaleFrame | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [lines, setLines] = useState<OcrLine[]>([]);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [beforeKg, setBeforeKg] = useState<number | null>(null);
  const [readKg, setReadKg] = useState<number | null>(null);
  const [event, setEvent] = useState<BinEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [ocrMs, setOcrMs] = useState<number | null>(null);
  const runRef = useRef(0);
  const startedRef = useRef(false);

  async function postReading(afterKg: number, source: "ocr" | "reference"): Promise<boolean> {
    if (!bin || !cleaner || !validLevel) return false;
    const res = await fetch("/api/readings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        binId: bin.id,
        level,
        afterKg,
        source,
        cleanerId: cleaner.id,
        photo: frame?.src ?? null,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { event?: BinEvent; error?: string };
    if (res.status === 409) {
      setReadKg(afterKg);
      setPhase("rejected");
      return false;
    }
    if (!res.ok || !body.event) throw new Error(body.error ?? `Save failed (${res.status}).`);
    setEvent(body.event);
    setPhase("saved");
    void refresh();
    return true;
  }

  async function run(exclude?: string, forcedBefore?: number) {
    if (!bin || !cleaner || !validLevel) return;
    const id = ++runRef.current;
    const live = () => runRef.current === id;
    setLines([]);
    setReadKg(null);
    setEvent(null);
    setError(null);
    setOcrMs(null);

    const before = forcedBefore ?? data.bins.find((b) => b.id === bin.id)?.weightKg ?? 0;
    setBeforeKg(before);
    const next = pickFrame(before, exclude);
    if (!next) {
      setPhase("swap");
      return;
    }
    setFrame(next);
    setPhase("aligning");
    await sleep(1500);
    if (!live()) return;
    setPhase("locked");
    await sleep(900);
    if (!live()) return;
    setPhase("captured");
    setSize(FRAME_SIZE);
    await sleep(500);
    if (!live()) return;

    setElapsed(0);
    setPhase("ocr");
    const started = Date.now();
    try {
      const result = await runDemoOcr({ kind: "scale", size: FRAME_SIZE, kg: next.refKg });
      if (!live()) return;
      setOcrMs(Date.now() - started);
      setLines(result.lines);
      setReadKg(result.kg ?? next.refKg);
      await postReading(result.kg ?? next.refKg, "ocr");
    } catch (err) {
      if (!live()) return;
      setError(err instanceof Error ? err.message : "OCR could not read this frame.");
      setPhase("failed");
    }
  }

  // Auto-start once the bin/cleaner resolve from bootstrap (StrictMode-safe: the
  // first mount's run is cancelled before it can save).
  useEffect(() => {
    if (!bin || !cleaner || !validLevel || startedRef.current) return;
    startedRef.current = true;
    const t = window.setTimeout(() => run(), 0);
    const runs = runRef;
    return () => {
      window.clearTimeout(t);
      runs.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bin, cleaner, validLevel]);

  useEffect(() => {
    if (phase !== "ocr") return;
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [phase]);

  if (loading) {
    return (
      <CleanerShell step={3}>
        <p className="rounded-md border border-black/10 bg-white p-5 text-[13px] text-smu-muted shadow-card">
          Loading weigh station…
        </p>
      </CleanerShell>
    );
  }

  if (!cleaner || !bin || !validLevel) {
    return (
      <CleanerShell step={3} cleaner={cleaner}>
        {cleaner ? (
          <div className="rounded-md border border-black/10 bg-white p-5 text-[14px] shadow-card">
            <p className="font-semibold text-smu-navy">Pick a building and pantry first</p>
            <Link
              href={`/cleaner/building?cleaner=${cleaner.id}`}
              className="mt-2 inline-block text-smu-gold underline underline-offset-2"
            >
              Back to pantry picker
            </Link>
          </div>
        ) : (
          <NeedsPass />
        )}
      </CleanerShell>
    );
  }

  const pantry = pantryLabel(bin, level);

  async function applyReference() {
    if (!frame) return;
    try {
      setReadKg(frame.refKg);
      await postReading(frame.refKg, "reference");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setPhase("failed");
    }
  }

  async function swapBin() {
    if (!bin || !cleaner) return;
    try {
      await apiRequest("/api/collect", {
        method: "POST",
        body: JSON.stringify({ binId: bin.id, cleanerId: cleaner.id }),
      });
      void refresh();
    } catch {
      // Already empty — weigh the fresh bin anyway.
    }
    run(undefined, 0);
  }

  const showFrame = frame != null;
  const busy = phase === "aligning" || phase === "locked" || phase === "captured" || phase === "ocr";
  const steps: Array<[string, string | null, boolean]> = [
    [
      "Camera",
      phase === "aligning"
        ? "finding display…"
        : phase === "locked"
          ? "steady…"
          : phase === "captured" || phase === "ocr" || phase === "saved"
            ? "auto-captured"
            : null,
      phase === "captured" || phase === "ocr" || phase === "saved",
    ],
    ["Upload", phase === "ocr" ? "sending…" : lines.length ? "sent" : null, lines.length > 0],
    [
      "OCR",
      phase === "ocr"
        ? `reading… ${elapsed}s`
        : lines.length
          ? lines.map((l) => `“${l.text}”`).join(" ")
          : null,
      lines.length > 0,
    ],
    ["Weight", readKg != null ? `${readKg.toFixed(2)} kg total` : null, readKg != null],
    ["Dashboard", phase === "saved" ? "updated" : null, phase === "saved"],
  ];

  return (
    <CleanerShell step={3} cleaner={cleaner}>
      <StepColumns
        main={
          <>
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <h1 className="font-display text-[30px] leading-9 text-smu-navy">
                  Weigh the {bin.short} central bin
                </h1>
                <p className="text-[13px] text-smu-muted">
                  Grounds from <span className="font-medium text-black">{pantry}</span> pantry
                </p>
              </div>
              <Link
                href={`/cleaner/building?cleaner=${cleaner.id}`}
                className="shrink-0 text-[12px] text-smu-muted underline underline-offset-2"
              >
                Change
              </Link>
            </div>

            <section className="overflow-hidden rounded-md border border-black/10 bg-white shadow-card">
              <div className="relative overflow-hidden bg-smu-navy-deep">
                {frame ? (
                  lines.length > 0 ? (
                    <BoxOverlay
                      src={frame.src}
                      lines={lines}
                      size={size ?? FRAME_SIZE}
                      activeIndex={activeLine}
                      onActiveChange={setActiveLine}
                      onLoad={setSize}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={frame.src}
                      alt="Overhead camera view of the floor scale"
                      className={`block h-auto w-full transition-[filter,transform] duration-[1400ms] ease-out ${
                        phase === "aligning" ? "scale-110 blur-[3px]" : "scale-100 blur-0"
                      }`}
                    />
                  )
                ) : (
                  <div className="grid aspect-video place-items-center text-[13px] text-white/55">
                    {phase === "swap" ? "Camera paused · bin needs swapping" : "Starting camera…"}
                  </div>
                )}

                {(phase === "aligning" || phase === "locked") && frame && (
                  <>
                    <span
                      className={`pointer-events-none absolute rounded border-2 transition-colors ${
                        phase === "locked" ? "border-smu-success" : "animate-pulse border-smu-gold"
                      }`}
                      style={{
                        left: `${LCD.x * 100}%`,
                        top: `${LCD.y * 100}%`,
                        width: `${LCD.w * 100}%`,
                        height: `${LCD.h * 100}%`,
                      }}
                    />
                    <span className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10.5px] font-medium text-white">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-smu-danger" /> LIVE ·
                      overhead cam
                    </span>
                    <span className="absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-white drop-shadow">
                      {phase === "aligning"
                        ? "Detecting scale display…"
                        : "Reading stable · capturing"}
                    </span>
                  </>
                )}

                {showFrame && (phase === "captured" || phase === "ocr" || phase === "saved") && (
                  <div
                    aria-hidden
                    className="absolute right-2 top-2 w-[34%] overflow-hidden rounded border-2 border-white shadow-lg"
                    style={{
                      aspectRatio: `${(LCD.w * 2752) / (LCD.h * 1536)}`,
                      backgroundImage: `url(${frame?.src})`,
                      backgroundSize: `${100 / LCD.w}% auto`,
                      backgroundPosition: `${(LCD.x / (1 - LCD.w)) * 100}% ${(LCD.y / (1 - LCD.h)) * 100}%`,
                    }}
                  />
                )}

                {phase === "captured" && (
                  <span className="shutter pointer-events-none absolute inset-0 bg-white" />
                )}
                {phase === "ocr" && (
                  <span className="absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-white drop-shadow">
                    Reading the scale display with OCR… {elapsed}s
                  </span>
                )}
              </div>

              <dl
                className={`flex flex-col gap-1.5 p-4 font-mono text-[11px] ${phase === "swap" ? "hidden" : ""}`}
              >
                {steps.map(([label, value, ok]) => (
                  <div key={label} className="flex justify-between gap-3">
                    <dt className="text-smu-muted">{label}</dt>
                    <dd className={`truncate text-right ${ok ? "text-[#287a28]" : ""}`}>
                      {value ?? "…"} {ok ? "✓" : ""}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </>
        }
        side={
          <>
            {busy && (
              // Laptop only: fills the side column while the camera works.
              <section className="hidden rounded-md border border-black/10 bg-white p-5 shadow-card lg:block">
                <p className="font-display text-[11px] uppercase tracking-[2px] text-smu-muted">
                  Weighing in progress
                </p>
                <dl className="mt-3 flex flex-col gap-2 text-[13px]">
                  {(
                    [
                      ["Cleaner", `${cleaner.name} · ${cleaner.pass}`],
                      ["Building", bin.name],
                      ["Pantry", pantry],
                      [
                        "Bin before",
                        beforeKg == null ? "…" : `${beforeKg.toFixed(2)} / ${bin.capacityKg} kg`,
                      ],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-smu-muted">{k}</dt>
                      <dd className="text-right font-medium text-smu-navy">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 flex items-center gap-2 rounded bg-smu-cream px-3 py-2 text-[11.5px] text-smu-muted">
                  <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-smu-gold" />
                  {phase === "ocr"
                    ? `Reading the scale display with OCR… ${elapsed}s`
                    : "Hold the bin still. The camera captures once the display is steady."}
                </p>
              </section>
            )}

            {phase === "saved" && event && (
              <section className="fade-up rounded-md border border-smu-success/30 bg-[#eef7ea] p-5">
                <p className="font-display text-[11px] uppercase tracking-[2px] text-[#287a28]">
                  Logged to audit trail
                </p>
                <p className="mt-1 font-display text-[34px] leading-10 tabular-nums text-[#287a28]">
                  +{event.kg.toFixed(2)} kg
                </p>
                <p className="text-[13px] text-smu-muted">
                  from {event.pantry} · bin {event.beforeKg?.toFixed(2)} →{" "}
                  {event.afterKg?.toFixed(2)} kg
                  <span className="text-black/40"> / {bin.capacityKg} kg</span>
                </p>
                <p className="mt-1 text-[11px] text-smu-muted">
                  {cleaner.name} ·{" "}
                  <span suppressHydrationWarning>{new Date(event.at).toLocaleTimeString()}</span> ·{" "}
                  {event.source === "ocr"
                    ? `OCR in ${((ocrMs ?? 0) / 1000).toFixed(1)}s`
                    : "reference reading"}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    href={`/dashboard?bin=${bin.id}`}
                    className="btn-smu btn-smu-gold col-span-2"
                  >
                    View {bin.short} on dashboard →
                  </Link>
                  <Link
                    href={`/cleaner/building?cleaner=${cleaner.id}`}
                    className="btn-smu btn-smu-outline btn-smu-sm"
                  >
                    Log another pantry
                  </Link>
                  <Link href="/cleaner" className="btn-smu btn-smu-outline btn-smu-sm">
                    Sign out
                  </Link>
                </div>
              </section>
            )}

            {phase === "rejected" && (
              <section className="fade-up rounded-md border border-smu-warning/30 bg-smu-warning/10 p-5 text-[13px]">
                <p className="font-semibold text-[#8a6209]">
                  Reading isn&apos;t above the bin&apos;s last total
                </p>
                <p className="mt-1 text-smu-muted">
                  Scale shows {readKg != null ? `${readKg.toFixed(2)} kg` : "no change"}, bin was{" "}
                  {beforeKg?.toFixed(2)} kg. The camera may have caught the scale before the grounds
                  settled.
                </p>
                <button
                  type="button"
                  onClick={() => run(frame?.src)}
                  className="btn-smu btn-smu-gold mt-3 w-full"
                >
                  <RefreshCw className="h-4 w-4" /> Retake photo
                </button>
              </section>
            )}

            {phase === "failed" && (
              <section className="fade-up rounded-md border border-smu-danger/25 bg-smu-danger/5 p-5 text-[13px]">
                <p className="font-semibold text-smu-danger">Couldn&apos;t read the scale</p>
                <p className="mt-1 text-smu-danger/80">{error}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => run()}
                    className="btn-smu btn-smu-gold btn-smu-sm"
                  >
                    Retry OCR
                  </button>
                  {frame && (
                    <button
                      type="button"
                      onClick={() => void applyReference()}
                      className="btn-smu btn-smu-outline btn-smu-sm"
                      title="Logs the frame's known reading, flagged as a fallback in the audit trail"
                    >
                      Use reference {frame.refKg} kg
                    </button>
                  )}
                </div>
              </section>
            )}

            {phase === "swap" && (
              <section className="fade-up rounded-md border border-smu-danger/25 bg-smu-danger/5 p-5 text-[13px]">
                <p className="font-semibold text-smu-danger">{bin.short} bin is too full to weigh</p>
                <p className="mt-1 text-smu-muted">
                  It already holds {beforeKg?.toFixed(1)} kg of {bin.capacityKg} kg. Swap in an
                  empty bin, then weigh again.
                </p>
                <button
                  type="button"
                  onClick={() => void swapBin()}
                  className="btn-smu btn-smu-gold mt-3 w-full"
                >
                  <Truck className="h-4 w-4" /> I&apos;ve swapped the bin · log collection
                </button>
              </section>
            )}

            <div className="hidden rounded-md border border-black/10 bg-white p-4 lg:block">
              <p className="flex items-center gap-2 text-[11.5px] text-smu-muted">
                <Camera className="h-3.5 w-3.5" /> Overhead camera
              </p>
              <p className="mt-2 flex items-center gap-2 text-[11.5px] text-smu-muted">
                <CheckCircle2 className="h-3.5 w-3.5 text-smu-success" /> Saves to the shared
                Postgres database
              </p>
            </div>

            {/* Demo controls: force the failure paths without touching the camera. */}
            {demoControlsEnabled && (
              <div className="rounded-md border border-dashed border-black/15 p-4">
                <p className="font-display text-[10px] uppercase tracking-[2px] text-black/35">
                  Demo states
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      runRef.current++;
                      setError("Demo: LCD glare prevented a clean read.");
                      setPhase("failed");
                    }}
                    className="btn-smu btn-smu-outline btn-smu-sm"
                  >
                    Simulate OCR failure
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      runRef.current++;
                      setReadKg(Math.max(0, (beforeKg ?? 0) - 0.4));
                      setPhase("rejected");
                    }}
                    className="btn-smu btn-smu-outline btn-smu-sm"
                  >
                    Simulate stale reading
                  </button>
                </div>
              </div>
            )}
          </>
        }
      />
    </CleanerShell>
  );
}
