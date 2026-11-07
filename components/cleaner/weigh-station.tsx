"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Camera,
  CheckCircle2,
  ImageIcon,
  RefreshCw,
  ScanText,
  Truck,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { BoxOverlay } from "@/components/smu/box-overlay";
import { levelsFor, pantryLabel } from "@/lib/bins";
import { useCamera } from "@/lib/client/camera";
import {
  imageSize,
  loadImage,
  padRect,
  readScaleWhenAwake,
  warmOcr,
  type Rect,
} from "@/lib/client/scale-ocr";
import { apiRequest, useBootstrap } from "@/lib/client/use-bootstrap";
import { demoControlsEnabled } from "@/lib/demo-controls";
import type { OcrLine } from "@/lib/languages";
import { pickFrame, SCALE_LCD } from "@/lib/scales";
import type { BinEvent } from "@/lib/types";
import { CleanerShell, NeedsPass, StepColumns } from "./cleaner-shell";

type Phase =
  | "choose"
  | "aligning"
  | "locked"
  | "captured"
  | "ocr"
  | "saved"
  | "rejected"
  | "failed"
  | "swap";

/** Where the photo comes from: a bundled sample photo, an uploaded photo, or the camera. */
type Source = "sample" | "upload" | "camera";

/** The photo being read. `crop` is the part sent to OCR, or null for the whole photo. */
type Shot = {
  src: string;
  crop: Rect | null;
  /** What a sample photo's display shows. Only used for the labelled fallback. */
  refKg: number | null;
  /** Saved with the reading so the audit trail can link to it. Only sample photos have a URL. */
  photo: string | null;
  source: Source;
};

type Size = { width: number; height: number };

const SOURCES: Array<[Source, string, LucideIcon]> = [
  ["sample", "Sample photo", ImageIcon],
  ["upload", "Upload photo", Upload],
  ["camera", "Camera", Camera],
];

/** Where to hold the scale display in the camera view. Centred, so mirroring the preview doesn't move it. */
const DISPLAY_GUIDE: Rect = { x: 0.2, y: 0.25, w: 0.6, h: 0.5 };
/** The sample photos' display, with a margin so the digits aren't cut off. */
const SAMPLE_CROP = padRect(SCALE_LCD, 0.25);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function WeighStation() {
  const params = useSearchParams();
  const { data, loading, refresh } = useBootstrap();
  const cleaner = data.cleaners.find((c) => c.id === params.get("cleaner"));
  const bin = data.bins.find((b) => b.id === params.get("bin"));
  const level = Number(params.get("level"));
  const validLevel =
    bin != null && Number.isInteger(level) && level >= 1 && level <= levelsFor(bin);

  const {
    videoRef: cameraRef,
    status: cameraStatus,
    error: cameraError,
    mirrored: cameraMirrored,
    start: startCamera,
    stop: stopCamera,
    capture: captureCamera,
  } = useCamera();
  const [source, setSource] = useState<Source>("sample");
  const [phase, setPhase] = useState<Phase>("choose");
  const [shot, setShot] = useState<Shot | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [lines, setLines] = useState<OcrLine[]>([]);
  const [ocrDone, setOcrDone] = useState(false);
  const [waking, setWaking] = useState(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [beforeKg, setBeforeKg] = useState<number | null>(null);
  const [readKg, setReadKg] = useState<number | null>(null);
  const [event, setEvent] = useState<BinEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [ocrMs, setOcrMs] = useState<number | null>(null);
  const runRef = useRef(0);
  const imageRef = useRef<HTMLImageElement | HTMLCanvasElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Wake the OCR service now, so it's likely ready by the time the photo is read.
  useEffect(() => {
    warmOcr();
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  /** Starts a new run and cancels any earlier one. Returns whether this run is still current. */
  function newRun(): () => boolean {
    const id = ++runRef.current;
    return () => runRef.current === id;
  }

  function clearResult() {
    setLines([]);
    setOcrDone(false);
    setWaking(false);
    setActiveLine(null);
    setReadKg(null);
    setEvent(null);
    setError(null);
    setOcrMs(null);
  }

  function currentKg(): number {
    return data.bins.find((b) => b.id === bin?.id)?.weightKg ?? 0;
  }

  async function postReading(
    afterKg: number,
    from: "ocr" | "reference",
    photo: string | null,
  ): Promise<boolean> {
    if (!bin || !cleaner || !validLevel) return false;
    const res = await fetch("/api/readings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ binId: bin.id, level, afterKg, source: from, cleanerId: cleaner.id, photo }),
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

  /** Sends the photo to OCR, retrying while the service wakes up, then saves the weight it read. */
  async function readShot(next: Shot, image: HTMLImageElement | HTMLCanvasElement, live: () => boolean) {
    if (!bin) return;
    setElapsed(0);
    setPhase("ocr");
    try {
      const result = await readScaleWhenAwake(image, next.crop, {
        isCurrent: live,
        onWaking: () => setWaking(true),
      });
      if (!result) return;
      setWaking(false);
      setOcrMs(result.ms);
      setLines(result.lines);
      setOcrDone(true);
      if (result.kg == null) {
        throw new Error(
          "OCR didn't find a weight on the scale display. Take the photo again with the display in view.",
        );
      }
      if (result.kg > bin.capacityKg) {
        throw new Error(
          `OCR read ${result.kg} kg, more than the bin's ${bin.capacityKg} kg capacity. Take the photo again.`,
        );
      }
      setReadKg(result.kg);
      await postReading(result.kg, "ocr", next.photo);
    } catch (err) {
      if (!live()) return;
      setWaking(false);
      setError(err instanceof Error ? err.message : "OCR could not read this photo.");
      setPhase("failed");
    }
  }

  /** Reads a sample photo, picking one that shows more than the bin already holds. */
  async function runSample(exclude?: string, forcedBefore?: number) {
    if (!bin || !cleaner || !validLevel) return;
    const live = newRun();
    clearResult();
    const before = forcedBefore ?? currentKg();
    setBeforeKg(before);
    const frame = pickFrame(before, exclude);
    if (!frame) {
      setShot(null);
      setPhase("swap");
      return;
    }
    const next: Shot = {
      src: frame.src,
      crop: SAMPLE_CROP,
      refKg: frame.refKg,
      photo: frame.src,
      source: "sample",
    };
    setShot(next);
    setPhase("aligning");
    const [image] = await Promise.all([loadImage(frame.src).catch(() => null), sleep(1500)]);
    if (!live()) return;
    if (!image) {
      setError("Couldn't load the sample photo.");
      setPhase("failed");
      return;
    }
    imageRef.current = image;
    setSize(imageSize(image));
    setPhase("locked");
    await sleep(900);
    if (!live()) return;
    setPhase("captured");
    await sleep(500);
    if (!live()) return;
    await readShot(next, image, live);
  }

  /** Reads an uploaded or camera photo. */
  async function runPhoto(image: HTMLImageElement | HTMLCanvasElement, next: Shot) {
    const live = newRun();
    clearResult();
    imageRef.current = image;
    setShot(next);
    setSize(imageSize(image));
    setPhase("captured");
    await sleep(500);
    if (!live()) return;
    await readShot(next, image, live);
  }

  function retryOcr() {
    if (!shot || !imageRef.current) return;
    const live = newRun();
    clearResult();
    void readShot(shot, imageRef.current, live);
  }

  /** Switches photo source and waits for the cleaner to start the read. */
  function chooseSource(next: Source, before = currentKg()) {
    if (!bin) return;
    runRef.current++;
    stopCamera();
    clearResult();
    setSource(next);
    setShot(null);
    setBeforeKg(before);
    if (before >= bin.capacityKg) {
      setPhase("swap");
      return;
    }
    setPhase("choose");
    if (next === "camera") void startCamera();
  }

  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a photo: JPEG, PNG or WebP.");
      return;
    }
    setError(null);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    try {
      const image = await loadImage(url);
      void runPhoto(image, { src: url, crop: null, refKg: null, photo: null, source: "upload" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open this photo.");
    }
  }

  function onCapture() {
    const frame = captureCamera();
    if (!frame) return;
    void runPhoto(frame, {
      src: frame.toDataURL("image/jpeg", 0.85),
      crop: DISPLAY_GUIDE,
      refKg: null,
      photo: null,
      source: "camera",
    });
  }

  // The page opens on the sample source and reads nothing until the cleaner starts a read,
  // so no reading is saved by surprise. Cancel any read in progress when leaving the page.
  useEffect(() => {
    const runs = runRef;
    return () => {
      runs.current++;
    };
  }, []);

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
    if (shot?.refKg == null) return;
    try {
      setReadKg(shot.refKg);
      await postReading(shot.refKg, "reference", shot.photo);
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
    chooseSource(source, 0);
  }

  const showCamera = source === "camera" && phase === "choose";
  const busy = phase === "aligning" || phase === "locked" || phase === "captured" || phase === "ocr";
  const inSetup = phase === "choose" || phase === "swap";
  const photoStatus =
    phase === "aligning"
      ? "finding display…"
      : phase === "locked"
        ? "steady…"
        : shot && !inSetup
          ? shot.source === "sample"
            ? "sample photo"
            : shot.source === "upload"
              ? "uploaded"
              : "captured"
          : null;
  const steps: Array<[string, string | null, boolean]> = [
    ["Photo", photoStatus, photoStatus != null && phase !== "aligning" && phase !== "locked"],
    [
      "Upload",
      phase === "ocr" ? (waking ? "waiting for OCR service…" : "sending…") : ocrDone ? "sent" : null,
      ocrDone,
    ],
    [
      "OCR",
      phase === "ocr"
        ? waking
          ? `service starting… ${elapsed}s`
          : `reading… ${elapsed}s`
        : ocrDone
          ? lines.length
            ? lines.map((l) => `“${l.text}”`).join(" ")
            : "no text found"
          : null,
      ocrDone && lines.length > 0,
    ],
    ["Weight", readKg != null ? `${readKg.toFixed(2)} kg total` : null, readKg != null],
    ["Dashboard", phase === "saved" ? "updated" : null, phase === "saved"],
  ];
  const ocrMessage = waking
    ? `OCR service is starting, retrying… ${elapsed}s`
    : `Reading the scale display with OCR… ${elapsed}s`;
  const inset =
    shot?.crop && size && (phase === "captured" || phase === "ocr" || phase === "saved")
      ? shot.crop
      : null;

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

            <div
              role="group"
              aria-label="Photo of the scale"
              className="grid grid-cols-3 gap-1 rounded-md border border-black/10 bg-white p-1"
            >
              {SOURCES.map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={source === value}
                  disabled={phase === "ocr" || phase === "saved"}
                  onClick={() => {
                    if (source !== value) chooseSource(value);
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded px-2 py-2 text-[12.5px] font-semibold transition-colors disabled:opacity-50 ${
                    source === value
                      ? "bg-smu-navy text-white"
                      : "text-smu-muted hover:bg-smu-cream hover:text-smu-navy"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            <section className="overflow-hidden rounded-md border border-black/10 bg-white shadow-card">
              <div className="relative overflow-hidden bg-smu-navy-deep">
                <video
                  ref={cameraRef}
                  playsInline
                  muted
                  className={`block h-auto w-full ${cameraMirrored ? "-scale-x-100" : ""} ${
                    showCamera && cameraStatus === "live" ? "" : "hidden"
                  }`}
                />

                {showCamera && cameraStatus === "live" && (
                  <>
                    <span
                      className="pointer-events-none absolute rounded border-2 border-smu-gold shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                      style={{
                        left: `${DISPLAY_GUIDE.x * 100}%`,
                        top: `${DISPLAY_GUIDE.y * 100}%`,
                        width: `${DISPLAY_GUIDE.w * 100}%`,
                        height: `${DISPLAY_GUIDE.h * 100}%`,
                      }}
                    />
                    <span className="absolute inset-x-0 top-2 text-center text-[11px] font-medium text-white drop-shadow">
                      Fit the scale&apos;s display inside the box
                    </span>
                  </>
                )}

                {showCamera && cameraStatus !== "live" && (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <Camera className="h-10 w-10 text-white/30" />
                    {cameraStatus === "starting" ? (
                      <p className="text-[13px] text-white/60">Starting camera…</p>
                    ) : (
                      <>
                        {cameraError && (
                          <p className="max-w-sm text-[13px] text-white/80">{cameraError}</p>
                        )}
                        <button
                          type="button"
                          onClick={() => void startCamera()}
                          className="btn-smu btn-smu-gold"
                        >
                          <Camera className="h-4 w-4" /> Open camera
                        </button>
                      </>
                    )}
                  </div>
                )}

                {source === "sample" && phase === "choose" && (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <ImageIcon className="h-10 w-10 text-white/30" />
                    <p className="max-w-sm text-[13px] text-white/70">
                      Read one of the sample overhead photos of the floor scale.
                    </p>
                    <button
                      type="button"
                      onClick={() => void runSample()}
                      className="btn-smu btn-smu-gold"
                    >
                      <ScanText className="h-4 w-4" /> Read sample photo
                    </button>
                  </div>
                )}

                {source === "upload" && phase === "choose" && (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <Upload className="h-10 w-10 text-white/30" />
                    <p className="max-w-sm text-[13px] text-white/70">
                      Upload a clear photo of the scale with its display in view.
                    </p>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="btn-smu btn-smu-gold"
                    >
                      <Upload className="h-4 w-4" /> Choose photo
                    </button>
                    {error && <p className="max-w-sm text-[13px] text-[#ffb4a8]">{error}</p>}
                  </div>
                )}

                {!inSetup &&
                  shot &&
                  (lines.length > 0 ? (
                    <BoxOverlay
                      src={shot.src}
                      lines={lines}
                      size={size}
                      activeIndex={activeLine}
                      onActiveChange={setActiveLine}
                      onLoad={setSize}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shot.src}
                      alt={
                        shot.source === "sample"
                          ? "Sample overhead photo of the floor scale"
                          : "Photo of the scale"
                      }
                      className={`block h-auto w-full transition-[filter,transform] duration-[1400ms] ease-out ${
                        phase === "aligning" ? "scale-110 blur-[3px]" : "scale-100 blur-0"
                      }`}
                    />
                  ))}

                {!inSetup && !shot && (
                  <div className="grid aspect-video place-items-center text-[13px] text-white/55">
                    Loading photo…
                  </div>
                )}

                {phase === "swap" && (
                  <div className="grid aspect-video place-items-center text-[13px] text-white/55">
                    Weighing paused · bin needs swapping
                  </div>
                )}

                {(phase === "aligning" || phase === "locked") && shot && (
                  <>
                    <span
                      className={`pointer-events-none absolute rounded border-2 transition-colors ${
                        phase === "locked" ? "border-smu-success" : "animate-pulse border-smu-gold"
                      }`}
                      style={{
                        left: `${SCALE_LCD.x * 100}%`,
                        top: `${SCALE_LCD.y * 100}%`,
                        width: `${SCALE_LCD.w * 100}%`,
                        height: `${SCALE_LCD.h * 100}%`,
                      }}
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10.5px] font-medium text-white">
                      Sample overhead photo
                    </span>
                    <span className="absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-white drop-shadow">
                      {phase === "aligning" ? "Finding the scale display…" : "Display found · capturing"}
                    </span>
                  </>
                )}

                {inset && shot && size && (
                  <div
                    aria-hidden
                    className="absolute right-2 top-2 w-[34%] overflow-hidden rounded border-2 border-white shadow-lg"
                    style={{
                      aspectRatio: `${(inset.w * size.width) / (inset.h * size.height)}`,
                      backgroundImage: `url("${shot.src}")`,
                      backgroundSize: `${100 / inset.w}% auto`,
                      backgroundPosition: `${inset.w < 1 ? (inset.x / (1 - inset.w)) * 100 : 0}% ${
                        inset.h < 1 ? (inset.y / (1 - inset.h)) * 100 : 0
                      }%`,
                    }}
                  />
                )}

                {phase === "captured" && (
                  <span className="shutter pointer-events-none absolute inset-0 bg-white" />
                )}
                {phase === "ocr" && (
                  <span className="absolute inset-x-0 bottom-2 text-center text-[11px] font-medium text-white drop-shadow">
                    {ocrMessage}
                  </span>
                )}
              </div>

              {showCamera && cameraStatus === "live" && (
                <div className="flex gap-2 p-3">
                  <button type="button" onClick={onCapture} className="btn-smu btn-smu-gold flex-1">
                    <Camera className="h-4 w-4" /> Capture and read
                  </button>
                  <button type="button" onClick={stopCamera} className="btn-smu btn-smu-outline">
                    Close camera
                  </button>
                </div>
              )}

              <dl
                className={`flex flex-col gap-1.5 p-4 font-mono text-[11px] ${inSetup ? "hidden" : ""}`}
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

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onUpload(e)}
            />
          </>
        }
        side={
          <>
            {busy && (
              // Laptop only: fills the side column while the photo is read.
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
                  {phase === "ocr" ? ocrMessage : "Finding the scale display in the photo…"}
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
                  {beforeKg?.toFixed(2)} kg. The photo may have caught the scale before the grounds
                  settled.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    source === "sample" ? void runSample(shot?.src) : chooseSource(source)
                  }
                  className="btn-smu btn-smu-gold mt-3 w-full"
                >
                  <RefreshCw className="h-4 w-4" /> Take another photo
                </button>
              </section>
            )}

            {phase === "failed" && (
              <section className="fade-up rounded-md border border-smu-danger/25 bg-smu-danger/5 p-5 text-[13px]">
                <p className="font-semibold text-smu-danger">Couldn&apos;t read the scale</p>
                <p className="mt-1 text-smu-danger/80">{error}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {shot && (
                    <button
                      type="button"
                      onClick={retryOcr}
                      className="btn-smu btn-smu-gold btn-smu-sm"
                    >
                      Retry OCR
                    </button>
                  )}
                  {shot?.refKg != null ? (
                    <button
                      type="button"
                      onClick={() => void applyReference()}
                      className="btn-smu btn-smu-outline btn-smu-sm"
                      title="Logs the sample photo's known reading, flagged as a fallback in the audit trail"
                    >
                      Use reference {shot.refKg} kg
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => chooseSource(source)}
                      className="btn-smu btn-smu-outline btn-smu-sm"
                    >
                      Take another photo
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
                <ScanText className="h-3.5 w-3.5" /> Reads the display with PaddleOCR on Hugging
                Face
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
