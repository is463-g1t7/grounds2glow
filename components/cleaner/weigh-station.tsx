"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  CheckCircle2,
  Keyboard,
  RefreshCw,
  ScanLine,
  ScanText,
  Smartphone,
  Truck,
} from "lucide-react";
import { BoxOverlay } from "@/components/smu/box-overlay";
import { levelsFor } from "@/lib/bins";
import { weight as kg } from "@/lib/format";
import {
  imageSize,
  loadImage,
  padRect,
  readScaleWhenAwake,
  warmOcr,
  type Rect,
} from "@/lib/client/scale-ocr";
import { useDemoMode, useScaleUnit } from "@/lib/client/station";
import { apiRequest, useBootstrap } from "@/lib/client/use-bootstrap";
import { useVisitKey } from "@/lib/client/use-visit-key";
import type { OcrLine } from "@/lib/languages";
import { toKg, type ScaleUnit } from "@/lib/scale-reading";
import { pickFrame, SAMPLE_FRAMES } from "@/lib/scales";
import type { BinEvent, EventSource } from "@/lib/types";
import { CleanerShell, LoadingPanel, NeedsPass, Panel } from "./cleaner-shell";

type Phase =
  | "choose"
  | "aligning"
  | "locked"
  | "captured"
  | "ocr"
  | "manual"
  | "saving"
  | "saved"
  | "rejected"
  | "failed"
  | "no-sample";

/**
 * Where the photo of the scale comes from. A phone at the bin will send it later;
 * until then a sample photo or an uploaded one stands in. A "demo" read has no real photo:
 * it borrows the sample photo for the animation, and the weight is the one the presenter chose.
 */
type Source = "sample" | "upload" | "demo";

const SEGMENTS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abdeg",
  "3": "abcdg",
  "4": "bcfg",
  "5": "acdfg",
  "6": "acdefg",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
};
/** x, y, width, height of each segment in a digit that is 10 wide and 24 tall. */
const SEGMENT_RECTS: Record<string, readonly [number, number, number, number]> = {
  a: [1.9, 0, 6.2, 2.4],
  b: [7.6, 1.9, 2.4, 9.2],
  c: [7.6, 12.9, 2.4, 9.2],
  d: [1.9, 21.6, 6.2, 2.4],
  e: [0, 12.9, 2.4, 9.2],
  f: [0, 1.9, 2.4, 9.2],
  g: [1.9, 10.8, 6.2, 2.4],
};
const LCD_INK = "#7d82ee";

/**
 * Demo reads: the weight written onto the sample photo's display in the same slanted
 * seven-segment style, over the original digits, so what the photo shows is what gets logged.
 */
function DemoDisplay({ lcd, kg: value }: { lcd: Rect; kg: number }) {
  const text = value.toFixed(3);
  const skew = 3.4;
  let x = 0;
  const parts: ReactNode[] = [];
  for (const ch of text) {
    if (ch === ".") {
      parts.push(<rect key={`dot-${x}`} x={x + 1} y={21.6} width={2.6} height={2.4} rx={0.6} fill={LCD_INK} />);
      x += 5;
      continue;
    }
    const lit = SEGMENTS[ch] ?? "";
    for (const seg of "abcdefg") {
      const [sx, sy, sw, sh] = SEGMENT_RECTS[seg];
      parts.push(
        <rect
          key={`${x}-${seg}`}
          x={x + sx}
          y={sy}
          width={sw}
          height={sh}
          rx={0.8}
          fill={LCD_INK}
          opacity={lit.includes(seg) ? 1 : 0.07}
        />
      );
    }
    x += 13;
  }
  return (
    <div
      className="absolute"
      style={{
        left: `${(lcd.x - 0.004) * 100}%`,
        top: `${(lcd.y - 0.006) * 100}%`,
        width: `${(lcd.w + 0.008) * 100}%`,
        height: `${(lcd.h + 0.011) * 100}%`,
        borderRadius: "4% / 10%",
        background: "linear-gradient(180deg, #d9dbee 0%, #c6c9e4 100%)",
        containerType: "size",
      }}
    >
      <span
        className="absolute font-bold leading-none"
        style={{ left: "3.5%", top: "9%", fontSize: "18cqh", color: LCD_INK }}
      >
        kg
      </span>
      <svg
        viewBox={`0 0 ${x - 3 + skew} 24`}
        preserveAspectRatio="xMaxYMid meet"
        className="absolute"
        style={{ right: "7%", top: "12%", width: "69%", height: "76%" }}
      >
        <g transform={`translate(${skew} 0) skewX(-8)`}>{parts}</g>
      </svg>
    </div>
  );
}

/** Demo mode: grounds a presenter can add in one tap. The scale then shows the bin's new total. */
const DEMO_ADDS_KG = [0.5, 1, 2];

/** The photo being read. `crop` is the part sent to OCR, or null for the whole photo. */
type Shot = {
  src: string;
  crop: Rect | null;
  /** What a sample photo's display shows. Only used for the labelled fallback. */
  refKg: number | null;
  /** Where a sample photo's display is, for the box drawn while it's found. */
  lcd: Rect | null;
  /** Saved with the reading so the audit trail can link to it. Only sample photos have a URL. */
  photo: string | null;
  source: Source;
  /** Demo reads only: the weight drawn onto the scale's display, so the photo matches the reading. */
  displayKg?: number;
};

type Size = { width: number; height: number };

/** After a drop-off is saved, sign out sooner so the next cleaner starts fresh. */
const SAVED_IDLE_MS = 30_000;

const SOURCE_TEXT: Record<EventSource, string> = {
  ocr: "Read from the photo",
  reference: "Sample photo's known reading",
  manual: "Typed in by hand",
  demo: "Demo reading",
};

/** A reading as the scale displayed it. `guessed` means the unit wasn't clear from the photo. */
type Shown = { value: number; unit: ScaleUnit; guessed: boolean };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** A weight written in kg to the gram, the way the scale and the audit trail have it: "0.129 kg". */
const kgText = (n: number) => `${Number(n.toFixed(3))} kg`;
/** A weight in the scale's own unit: "850 g" or "4.20 kg". */
const shownText = (value: number, unit: ScaleUnit) =>
  unit === "g" ? `${value.toLocaleString("en", { maximumFractionDigits: 1 })} g` : kgText(value);
/** A kg amount written in `unit`. */
const inUnit = (kgValue: number, unit: ScaleUnit) =>
  unit === "g" ? shownText(Math.round(kgValue * 1000), "g") : kgText(kgValue);

/** Reads a typed weight in `unit`. Grams may use a thousands comma ("1,250"). */
function parseTyped(text: string, unit: ScaleUnit): number | null {
  let s = text.trim();
  if (unit === "g" && /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else s = s.replace(",", ".");
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null;
}

export function WeighStation() {
  return <WeighStationVisit key={useVisitKey()} />;
}

function WeighStationVisit() {
  const params = useSearchParams();
  const demo = useDemoMode();
  const scaleUnit = useScaleUnit();
  const { data, loading, refresh } = useBootstrap();
  const cleaner = data.cleaners.find((c) => c.id === params.get("cleaner"));
  const bin = data.bins.find((b) => b.id === params.get("bin"));
  const level = Number(params.get("level"));
  const validLevel =
    bin != null && Number.isInteger(level) && level >= 1 && level <= levelsFor(bin);

  const [phase, setPhase] = useState<Phase>("choose");
  const [shot, setShot] = useState<Shot | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [lines, setLines] = useState<OcrLine[]>([]);
  const [ocrDone, setOcrDone] = useState(false);
  const [waking, setWaking] = useState(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [beforeKg, setBeforeKg] = useState<number | null>(null);
  const [readKg, setReadKg] = useState<number | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [typed, setTyped] = useState("");
  const [typedUnit, setTypedUnit] = useState<ScaleUnit>("kg");
  const [event, setEvent] = useState<BinEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ kg: number; from: EventSource } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [ocrMs, setOcrMs] = useState<number | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [justSwapped, setJustSwapped] = useState(false);
  const runRef = useRef(0);
  const imageRef = useRef<HTMLImageElement | HTMLCanvasElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Wake the OCR service now, so it's likely ready by the time the photo is read.
  // Leaving the page cancels any read in progress.
  useEffect(() => {
    warmOcr();
    const runs = runRef;
    return () => {
      runs.current++;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
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
        <LoadingPanel label="Loading the weigh step…" />
      </CleanerShell>
    );
  }

  if (!cleaner || !bin || !validLevel) {
    return (
      <CleanerShell step={3} cleaner={cleaner}>
        {cleaner ? (
          <Panel className="max-w-xl p-6">
            <h1 className="font-display text-[30px] leading-9 text-smu-navy">
              Choose a pantry first
            </h1>
            <Link
              href={`/cleaner/building?cleaner=${cleaner.id}`}
              className="btn-smu btn-smu-gold mt-5"
            >
              Choose pantry
            </Link>
          </Panel>
        ) : (
          <NeedsPass />
        )}
      </CleanerShell>
    );
  }

  const binKg = bin.weightKg;
  const before = beforeKg ?? binKg;
  const full = binKg >= bin.capacityKg;
  const busy = phase === "aligning" || phase === "locked" || phase === "captured" || phase === "ocr";
  const pickHref = `/cleaner/building?cleaner=${cleaner.id}`;

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
    setRead(null);
    setEvent(null);
    setError(null);
    setPending(null);
    setOcrMs(null);
    setJustSwapped(false);
  }

  /** Sets the reading in kg, and how the scale showed it (kg, unless given). */
  function setRead(kgValue: number | null, how?: Shown) {
    setReadKg(kgValue);
    setShown(kgValue == null ? null : (how ?? { value: kgValue, unit: "kg", guessed: false }));
  }

  function backToStart() {
    runRef.current++;
    clearResult();
    setShot(null);
    setBeforeKg(null);
    setPhase("choose");
  }

  async function save(afterKg: number, from: EventSource, photo = shot?.photo ?? null) {
    if (!bin || !cleaner) return;
    setPhase("saving");
    setError(null);
    setPending({ kg: afterKg, from });
    try {
      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          binId: bin.id,
          level,
          afterKg,
          source: from,
          cleanerId: cleaner.id,
          photo,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { event?: BinEvent; error?: string };
      if (res.status === 409) {
        setPending(null);
        setReadKg(afterKg);
        setPhase("rejected");
        return;
      }
      if (!res.ok || !body.event) throw new Error(body.error ?? `Saving failed (${res.status}).`);
      setEvent(body.event);
      setPhase("saved");
      void refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Nothing was saved.`
          : "Couldn't save the reading. Nothing was saved.",
      );
      setPhase("failed");
    }
  }

  /** Sends the photo to OCR, retrying while the service wakes up, then logs the weight it read. */
  async function readShot(
    next: Shot,
    image: HTMLImageElement | HTMLCanvasElement,
    startKg: number,
    live: () => boolean,
  ) {
    if (!bin) return;
    setElapsed(0);
    setPhase("ocr");
    try {
      const result = await readScaleWhenAwake(image, next.crop, {
        isCurrent: live,
        onWaking: () => setWaking(true),
        // Sample photos are of the prototype's scale, whose LCD unit OCR can't see: digits are grams.
        unit: next.source === "sample" ? "g" : scaleUnit,
        capacityKg: bin.capacityKg,
      });
      if (!result) return;
      setWaking(false);
      setOcrMs(result.ms);
      setLines(result.lines);
      setOcrDone(true);
      const reading = result.reading;
      if (!reading) {
        throw new Error(
          "No weight was found on the scale display. Retake the photo with the display in view, or type the weight.",
        );
      }
      if (reading.kg > bin.capacityKg) {
        throw new Error(
          `The photo seems to show ${shownText(reading.value, reading.unit)}, more than the bin's ${bin.capacityKg} kg. Retake the photo, or type the weight.`,
        );
      }
      setRead(reading.kg, {
        value: reading.value,
        unit: reading.unit,
        guessed: reading.unitFrom === "guess",
      });
      if (reading.kg <= startKg) {
        setPhase("rejected");
        return;
      }
      await save(reading.kg, "ocr", next.photo);
    } catch (err) {
      if (!live()) return;
      setWaking(false);
      setError(err instanceof Error ? err.message : "The photo couldn't be read.");
      setPhase("failed");
    }
  }

  /** Reads a sample photo, picking one that shows more than the bin already holds. */
  async function runSample(exclude?: string) {
    const live = newRun();
    clearResult();
    setBeforeKg(binKg);
    const frame = pickFrame(binKg, exclude);
    if (!frame) {
      setShot(null);
      setPhase("no-sample");
      return;
    }
    const next: Shot = {
      src: frame.src,
      // A margin around the display so the digits aren't cut off.
      crop: padRect(frame.lcd, 0.25),
      refKg: frame.refKg,
      lcd: frame.lcd,
      photo: frame.src,
      source: "sample",
    };
    setShot(next);
    setPhase("aligning");
    const [image] = await Promise.all([loadImage(frame.src).catch(() => null), sleep(1200)]);
    if (!live()) return;
    if (!image) {
      setError("The sample photo didn't load. Check the connection and try again.");
      setPhase("failed");
      return;
    }
    imageRef.current = image;
    setSize(imageSize(image));
    setPhase("locked");
    await sleep(700);
    if (!live()) return;
    setPhase("captured");
    await sleep(400);
    if (!live()) return;
    await readShot(next, image, binKg, live);
  }

  /**
   * Demo mode: plays the same find-the-display animation on the sample photo, then logs the
   * weight the presenter chose instead of reading the photo. It's saved as a "demo" reading.
   */
  async function runDemo(addKg: number) {
    const live = newRun();
    clearResult();
    setBeforeKg(binKg);
    const total = Math.round((binKg + addKg) * 1000) / 1000;
    const frame = SAMPLE_FRAMES[0];
    const next: Shot = {
      src: frame.src,
      crop: null,
      refKg: null,
      lcd: frame.lcd,
      photo: null,
      source: "demo",
      displayKg: total,
    };
    setShot(next);
    setPhase("aligning");
    const [image] = await Promise.all([loadImage(frame.src).catch(() => null), sleep(1200)]);
    if (!live()) return;
    if (!image) {
      setError("The sample photo didn't load. Check the connection and try again.");
      setPhase("failed");
      return;
    }
    imageRef.current = image;
    setSize(imageSize(image));
    setPhase("locked");
    await sleep(700);
    if (!live()) return;
    setPhase("captured");
    await sleep(400);
    if (!live()) return;
    setRead(total);
    await save(total, "demo", null);
  }

  async function onUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn't a photo. Choose a JPEG, PNG or WebP.");
      setPhase("failed");
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    const live = newRun();
    clearResult();
    setBeforeKg(binKg);
    try {
      const image = await loadImage(url);
      if (!live()) return;
      const next: Shot = { src: url, crop: null, refKg: null, lcd: null, photo: null, source: "upload" };
      imageRef.current = image;
      setShot(next);
      setSize(imageSize(image));
      setPhase("captured");
      await sleep(400);
      if (!live()) return;
      await readShot(next, image, binKg, live);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That photo couldn't be opened.");
      setPhase("failed");
    }
  }

  function chooseUpload() {
    fileRef.current?.click();
  }

  function retake() {
    if (shot?.source === "sample") {
      void runSample(shot.src);
    } else if (shot?.source === "demo") {
      backToStart();
    } else {
      backToStart();
      chooseUpload();
    }
  }

  function retryRead() {
    if (!shot || !imageRef.current) return;
    const live = newRun();
    clearResult();
    void readShot(shot, imageRef.current, before, live);
  }

  function typeInstead() {
    runRef.current++;
    setWaking(false);
    setError(null);
    setBeforeKg(before);
    const unit = shown?.unit ?? scaleUnit;
    setTypedUnit(unit);
    setTyped(shown ? String(shown.value) : "");
    setPhase("manual");
  }

  async function swapBin() {
    if (!bin || !cleaner) return;
    setSwapping(true);
    try {
      await apiRequest("/api/collect", {
        method: "POST",
        body: JSON.stringify({ binId: bin.id, cleanerId: cleaner.id }),
      });
    } catch {
      // Already empty: weigh it anyway.
    }
    await refresh();
    setSwapping(false);
    backToStart();
    setJustSwapped(true);
  }

  // ----- What the right-hand panel shows for each phase -----

  const typedValue = parseTyped(typed, typedUnit);
  const typedKg = typedValue == null ? Number.NaN : toKg(typedValue, typedUnit);
  const typedValid = typedValue != null && typedKg > before && typedKg <= bin.capacityKg;
  const typedProblem =
    typed.trim() === "" || typedValid
      ? null
      : typedValue == null
        ? `Type the number on the display, like ${typedUnit === "g" ? "850" : "0.850"}.`
        : typedKg > bin.capacityKg
          ? `That's more than the bin holds (${inUnit(bin.capacityKg, typedUnit)}).`
          : `That isn't more than the ${inUnit(before, typedUnit)} already in the bin.`;

  function submitTyped(e: FormEvent) {
    e.preventDefault();
    if (!typedValid || typedValue == null) return;
    setRead(typedKg, { value: typedValue, unit: typedUnit, guessed: false });
    void save(typedKg, "manual");
  }

  const typeButton = (
    <button type="button" onClick={typeInstead} className="cleaner-link">
      <Keyboard className="h-5 w-5" /> Type the weight instead
    </button>
  );

  const demoChips = demo ? (
    <div className="rounded border border-dashed border-black/25 p-3">
      <p className="text-[14px] font-semibold text-black/70">Demo · weight to read</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {DEMO_ADDS_KG.map((add) => {
          const total = Math.round((binKg + add) * 1000) / 1000;
          const fits = total <= bin.capacityKg;
          return (
            <button
              key={add}
              type="button"
              disabled={!fits}
              onClick={() => void runDemo(add)}
              title={
                fits
                  ? `The scale will show ${kg(total)} in total`
                  : `More than the bin holds (${kg(bin.capacityKg)})`
              }
              className="btn-smu btn-smu-outline btn-smu-sm disabled:cursor-not-allowed disabled:opacity-45"
            >
              +{kg(add)}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[13px] leading-5 text-black/60">
        Added to the {kg(binKg)} already in the bin, and logged as a demo reading.
      </p>
    </div>
  ) : null;

  let panel: ReactNode;
  if (phase === "choose" && full) {
    panel = (
      <>
        <PanelTitle>The {bin.short} bin is full</PanelTitle>
        <p className="cleaner-body">
          It holds {kg(bin.weightKg)} of {kg(bin.capacityKg)}. Swap in an empty bin, then weigh the
          new grounds.
        </p>
        <button
          type="button"
          onClick={() => void swapBin()}
          disabled={swapping}
          className="btn-smu btn-smu-gold cleaner-action"
        >
          <Truck className="h-5 w-5" /> {swapping ? "Logging swap…" : "I've swapped in an empty bin"}
        </button>
      </>
    );
  } else if (phase === "choose") {
    panel = (
      <>
        <PanelTitle>Choose how to read the scale</PanelTitle>
        {justSwapped && <SwapReminder />}
        <p className="cleaner-body">
          Put the bin on the scale, then pick an option. The weight is logged automatically.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void runSample()}
            title="Reads a sample photo of the scale display"
            className="btn-smu btn-smu-gold cleaner-action"
          >
            <ScanLine className="h-5 w-5" /> Read the scale
          </button>
          <button
            type="button"
            onClick={chooseUpload}
            title="Reads a photo you choose from this device"
            className="btn-smu btn-smu-outline cleaner-action"
          >
            <ScanText className="h-5 w-5" /> OCR scan
          </button>
        </div>
        {demoChips}
        {typeButton}
      </>
    );
  } else if (busy) {
    panel = (
      <>
        <PanelTitle>Reading the scale…</PanelTitle>
        <p className="flex items-center gap-3 text-[17px] text-black/80" role="status">
          <span className="h-3 w-3 shrink-0 animate-pulse rounded-full bg-smu-gold" />
          {phase === "ocr"
            ? waking
              ? `The reader is starting up · ${elapsed}s`
              : `Reading the display · ${elapsed}s`
            : "Finding the display in the photo"}
        </p>
        {waking && (
          <p className="cleaner-body">
            The first reading of the day can take up to a minute. You can type the weight instead.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {typeButton}
          <button type="button" onClick={backToStart} className="cleaner-link text-black/70">
            Cancel
          </button>
        </div>
      </>
    );
  } else if (phase === "manual") {
    panel = (
      <form onSubmit={submitTyped} className="flex flex-col gap-5">
        <PanelTitle>Type the weight on the scale</PanelTitle>
        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="typed-kg" className="block text-[16px] font-semibold text-smu-navy">
              Number on the display
            </label>
            <div role="group" aria-label="Unit on the display" className="flex rounded border border-black/15 p-0.5">
              {(["kg", "g"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={typedUnit === u}
                  onClick={() => setTypedUnit(u)}
                  className={`h-9 min-w-12 rounded-sm px-3 text-[15px] font-semibold transition-colors ${
                    typedUnit === u ? "bg-smu-navy text-white" : "text-black/70 hover:bg-smu-cream"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="relative mt-2">
            <input
              id="typed-kg"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={typedUnit === "g" ? "0" : "0.000"}
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              aria-invalid={typedProblem ? true : undefined}
              aria-describedby="typed-kg-hint"
              className="h-20 w-full rounded border border-black/20 bg-white px-4 pr-16 font-display text-[44px] tabular-nums text-smu-navy placeholder:text-black/55 focus:border-smu-gold focus:outline-none focus:ring-2 focus:ring-smu-gold/30"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[22px] text-black/60">
              {typedUnit}
            </span>
          </div>
          <p id="typed-kg-hint" className="mt-2 text-[15px] leading-6 text-black/70">
            The scale shows the whole bin, including the {inUnit(before, typedUnit)} already in
            it.
          </p>
          {typedProblem && (
            <p className="mt-2 text-[15px] font-semibold text-[#a52a25]" role="alert">
              {typedProblem}
            </p>
          )}
        </div>
        {typedValid && <Sum before={before} after={typedKg} level={level} />}
        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={!typedValid}
            className="btn-smu btn-smu-gold cleaner-action disabled:cursor-not-allowed disabled:opacity-45"
          >
            <CheckCircle2 className="h-5 w-5" />{" "}
            {typedValid && typedValue != null ? `Save ${shownText(typedValue, typedUnit)}` : "Save"}
          </button>
          <button
            type="button"
            onClick={backToStart}
            className="btn-smu btn-smu-outline cleaner-action"
          >
            Back to the photo
          </button>
        </div>
      </form>
    );
  } else if (phase === "saving") {
    panel = (
      <>
        <PanelTitle>Saving…</PanelTitle>
        <p className="cleaner-body" role="status">
          Logging {shown ? shownText(shown.value, shown.unit) : pending ? kg(pending.kg) : "the reading"}{" "}
          for the Level {level} pantry.
        </p>
      </>
    );
  } else if (phase === "saved" && event) {
    panel = (
      <>
        <div className="fade-up flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-smu-success text-white">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <PanelTitle>Drop-off logged</PanelTitle>
        </div>
        <p className="font-display text-[56px] leading-[60px] tabular-nums text-[#287a28]">
          +{kg(event.kg)}
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[16px]">
          <dt className="text-black/65">From</dt>
          <dd className="text-right font-semibold">
            {bin.short} · Level {level} pantry
          </dd>
          <dt className="text-black/65">Bin now</dt>
          <dd className="text-right font-semibold tabular-nums">
            {kg(event.afterKg ?? 0)} of {bin.capacityKg} kg
          </dd>
          <dt className="text-black/65">How</dt>
          <dd className="text-right">
            {SOURCE_TEXT[event.source ?? "ocr"]}
            {shown?.unit === "g" && ` · scale showed ${shownText(shown.value, "g")}`}
          </dd>
          <dt className="text-black/65">By</dt>
          <dd className="text-right">
            {cleaner.name} at{" "}
            <span suppressHydrationWarning>
              {new Date(event.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          </dd>
        </dl>
        <div className="flex flex-col gap-3">
          <Link href={pickHref} autoFocus className="btn-smu btn-smu-gold cleaner-action">
            Log another level
          </Link>
          <Link href="/cleaner" className="btn-smu btn-smu-outline cleaner-action">
            Done, sign out
          </Link>
        </div>
        <Link href={`/dashboard?bin=${bin.id}`} target="_blank" className="text-link text-[15px]">
          See it on the dashboard
        </Link>
      </>
    );
  } else if (phase === "rejected") {
    panel = (
      <>
        <PanelTitle>
          {readKg === 0 ? "The scale shows nothing" : "That reading looks too low"}
        </PanelTitle>
        {readKg === 0 ? (
          <p className="cleaner-body">
            The photo shows {shown ? shownText(shown.value, shown.unit) : "0"} on the display. Was the
            bin on the scale when the photo was taken?
          </p>
        ) : (
          <p className="cleaner-body">
            The scale shows{" "}
            {shown
              ? `${shownText(shown.value, shown.unit)}${shown.unit === "g" ? ` (${kgText(readKg ?? 0)})` : ""}`
              : "no change"}
            , but the bin already held {inUnit(before, shown?.unit ?? "kg")}. The photo may have been
            taken before the grounds went in.
          </p>
        )}
        <div className="flex flex-col gap-3">
          <button type="button" onClick={retake} className="btn-smu btn-smu-gold cleaner-action">
            <RefreshCw className="h-5 w-5" /> Retake the photo
          </button>
        </div>
        {typeButton}
      </>
    );
  } else if (phase === "no-sample") {
    panel = (
      <>
        <PanelTitle>No sample photo fits this bin</PanelTitle>
        <p className="cleaner-body">
          The bin already holds {kg(before)}, more than any sample photo shows. Use OCR scan,
          type the weight, or swap in an empty bin.
        </p>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={chooseUpload} className="btn-smu btn-smu-gold cleaner-action">
            <ScanText className="h-5 w-5" /> OCR scan
          </button>
          <button
            type="button"
            onClick={() => void swapBin()}
            disabled={swapping}
            className="btn-smu btn-smu-outline cleaner-action"
          >
            <Truck className="h-5 w-5" /> {swapping ? "Logging swap…" : "I've swapped in an empty bin"}
          </button>
        </div>
        {demoChips}
        {typeButton}
      </>
    );
  } else {
    // failed
    panel = (
      <>
        <PanelTitle>{pending ? "The reading wasn't saved" : "Couldn't read the scale"}</PanelTitle>
        <p className="cleaner-body" role="alert">
          {error}
        </p>
        <div className="flex flex-col gap-3">
          {pending ? (
            <button
              type="button"
              onClick={() => void save(pending.kg, pending.from)}
              className="btn-smu btn-smu-gold cleaner-action"
            >
              <RefreshCw className="h-5 w-5" /> Try saving again
            </button>
          ) : (
            <>
              {shot && (
                <button type="button" onClick={retryRead} className="btn-smu btn-smu-gold cleaner-action">
                  <ScanText className="h-5 w-5" /> Read this photo again
                </button>
              )}
              <button
                type="button"
                onClick={retake}
                className={`btn-smu cleaner-action ${shot ? "btn-smu-outline" : "btn-smu-gold"}`}
              >
                <RefreshCw className="h-5 w-5" /> {shot ? "Retake the photo" : "Choose another photo"}
              </button>
              {shot?.refKg != null && (
                <button
                  type="button"
                  onClick={() => {
                    setRead(shot.refKg);
                    void save(shot.refKg as number, "reference");
                  }}
                  className="cleaner-link"
                  title="Logged as the sample's known reading, flagged in the audit trail"
                >
                  Use the sample&apos;s known reading ({kg(shot.refKg)})
                </button>
              )}
            </>
          )}
        </div>
        {!pending && typeButton}
      </>
    );
  }

  // ----- Photo stage -----

  const showPhoto = shot != null && phase !== "choose" && phase !== "no-sample";
  const typedByHand = phase === "manual" || pending?.from === "manual";
  const inset =
    showPhoto && shot?.crop && size && (phase === "ocr" || phase === "saved")
      ? shot.crop
      : null;

  const stage = showPhoto ? (
    <div
      className="relative mx-auto w-full"
      style={size ? { maxWidth: `calc(64vh * ${size.width / size.height})` } : undefined}
    >
      {lines.length > 0 ? (
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
            shot.source === "demo" && shot.displayKg != null
              ? `Demo: the scale display reads ${shot.displayKg.toFixed(3)} kg`
              : shot.source !== "upload"
                ? "Sample photo of the scale"
                : "Photo of the scale"
          }
          className={`block h-auto w-full transition-[filter,transform] duration-[1200ms] ease-out ${
            phase === "aligning" ? "scale-110 blur-[3px]" : "scale-100 blur-0"
          }`}
        />
      )}

      {shot.source === "demo" && shot.displayKg != null && shot.lcd && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 transition-[filter,transform] duration-[1200ms] ease-out ${
            phase === "aligning" ? "scale-110 blur-[3px]" : "scale-100 blur-0"
          }`}
        >
          <DemoDisplay lcd={shot.lcd} kg={shot.displayKg} />
        </div>
      )}

      {(phase === "aligning" || phase === "locked") && shot.lcd && (
        <span
          className={`pointer-events-none absolute rounded border-[3px] transition-colors ${
            phase === "locked" ? "border-smu-success" : "animate-pulse border-smu-gold"
          }`}
          style={{
            left: `${shot.lcd.x * 100}%`,
            top: `${shot.lcd.y * 100}%`,
            width: `${shot.lcd.w * 100}%`,
            height: `${shot.lcd.h * 100}%`,
          }}
        />
      )}

      {inset && size && (
        <div className="absolute right-3 top-3 w-[38%]">
          <div
            aria-hidden
            className="overflow-hidden rounded border-2 border-white shadow-[0_8px_24px_-8px_rgb(0_0_0/0.6)]"
            style={{
              aspectRatio: `${(inset.w * size.width) / (inset.h * size.height)}`,
              backgroundImage: `url("${shot.src}")`,
              backgroundSize: `${100 / inset.w}% auto`,
              backgroundPosition: `${inset.w < 1 ? (inset.x / (1 - inset.w)) * 100 : 0}% ${
                inset.h < 1 ? (inset.y / (1 - inset.h)) * 100 : 0
              }%`,
            }}
          />
          <p className="mt-1 text-right text-[13px] font-semibold text-white [text-shadow:0_1px_3px_rgb(0_0_0/0.8)]">
            The display, close up
          </p>
        </div>
      )}

      {shot.source === "demo" && (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-black/65 px-3 py-2 text-[13px] text-white">
          Demo reading · display set to {shot.displayKg?.toFixed(3)} kg
        </p>
      )}

      {phase === "captured" && <span className="shutter pointer-events-none absolute inset-0 bg-white" />}
    </div>
  ) : (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 p-8 text-center text-white">
      {typedByHand ? (
        <Keyboard className="h-14 w-14 text-white/40" />
      ) : full && phase === "choose" ? (
        <Truck className="h-14 w-14 text-white/40" />
      ) : (
        <Smartphone className="h-14 w-14 text-white/40" />
      )}
      <p className="font-display text-[28px] leading-9">
        {typedByHand
          ? "Weight typed by hand"
          : full && phase === "choose"
            ? "Swap the bin first"
            : "Waiting for a photo of the scale"}
      </p>
      {!typedByHand && !(full && phase === "choose") && (
        <p className="max-w-md text-[16px] leading-6 text-white/70">
          The phone at this bin will send it here. Until that&apos;s set up, use Read the scale (a
          sample photo) or OCR scan (a photo you choose).
        </p>
      )}
    </div>
  );

  // ----- Demo-only details for assessors -----

  const pipeline: Array<[string, string | null, boolean]> = [
    ["Photo", shot ? (shot.source === "sample" ? "sample photo" : shot.source === "demo" ? "stand-in sample photo" : "uploaded") : null, shot != null && !busy],
    [
      "OCR",
      phase === "ocr"
        ? waking
          ? `service starting… ${elapsed}s`
          : `reading… ${elapsed}s`
        : ocrDone
          ? lines.length
            ? `${lines.map((l) => `“${l.text}”`).join(" ")}${ocrMs ? ` in ${(ocrMs / 1000).toFixed(1)}s` : ""}`
            : "no text found"
          : null,
      ocrDone && lines.length > 0,
    ],
    [
      "Weight",
      readKg != null && shown
        ? `${shownText(shown.value, shown.unit)}${shown.unit === "g" ? ` → ${kgText(readKg)}` : ""} total${
            shown.guessed ? " (unit guessed)" : ""
          }`
        : null,
      readKg != null,
    ],
    ["Dashboard", phase === "saved" ? "updated" : null, phase === "saved"],
  ];

  return (
    <CleanerShell
      step={3}
      cleaner={cleaner}
      where={`${bin.short} central bin`}
      idleMs={phase === "saved" ? SAVED_IDLE_MS : undefined}
      pauseIdle={busy || phase === "saving"}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <h1 className="font-display text-[36px] leading-[44px] text-smu-navy lg:text-[42px] lg:leading-[50px]">
            Weigh the {bin.short} bin
          </h1>
          <p className="mt-1 text-[17px] text-black/75">
            Grounds from the <span className="font-semibold text-black">Level {level}</span> pantry
            <span aria-hidden> · </span>
            <span className="tabular-nums">bin held {kg(before)}</span>
            {scaleUnit === "g" && (
              <>
                <span aria-hidden> · </span>scale shows grams
              </>
            )}
          </p>
        </div>
        {phase !== "saved" && phase !== "saving" && (
          <Link href={pickHref} className="cleaner-link">
            Change level
          </Link>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="overflow-hidden rounded-md bg-smu-navy-deep">{stage}</div>

          {demo && (
            <div className="rounded-md border border-dashed border-black/20 p-4">
              <p className="text-[14px] font-semibold text-black/70">Demo · how the reading travels</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 font-mono text-[13px]">
                {pipeline.map(([label, value, ok]) => (
                  <div key={label} className="contents">
                    <dt className="text-black/60">{label}</dt>
                    <dd className={`truncate text-right ${ok ? "text-[#287a28]" : "text-black/70"}`}>
                      {value ?? "…"}
                      {ok ? " ✓" : ""}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[13px] text-black/60">
                Reads the display with PaddleOCR on Hugging Face, saves to the shared Postgres
                database.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    runRef.current++;
                    setWaking(false);
                    setPending(null);
                    setError("Demo: glare on the display stopped a clean read.");
                    setPhase("failed");
                  }}
                  className="btn-smu btn-smu-outline btn-smu-sm"
                >
                  Simulate unreadable photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    runRef.current++;
                    setWaking(false);
                    setBeforeKg(before);
                    setRead(Math.max(0, Math.round((before - 0.4) * 100) / 100));
                    setPhase("rejected");
                  }}
                  className="btn-smu btn-smu-outline btn-smu-sm"
                >
                  Simulate too-low reading
                </button>
              </div>
            </div>
          )}
        </div>

        <Panel className="flex flex-col gap-5 p-6 lg:sticky lg:top-6">{panel}</Panel>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onUpload(e)}
      />
    </CleanerShell>
  );
}

function SwapReminder() {
  return (
    <p
      role="status"
      className="rounded border border-smu-gold/40 bg-smu-cream-light px-4 py-3 text-[16px] leading-6 text-black/85"
    >
      Bin swapped. Put the empty bin on the scale and press <strong>Z/T</strong>, then add the
      grounds.
    </p>
  );
}

function PanelTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-display text-[30px] leading-9 text-smu-navy">{children}</h2>;
}

/** The bin's weight before and after, and what this pantry added. */
function Sum({ before, after, level }: { before: number; after: number; level: number }) {
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 border-y border-black/10 py-3 text-[16px] tabular-nums">
      <dt className="text-black/65">Bin before</dt>
      <dd className="text-right">{kg(before)}</dd>
      <dt className="text-black/65">Bin now</dt>
      <dd className="text-right">{kg(after)}</dd>
      <dt className="font-semibold">Added from Level {level}</dt>
      <dd className="text-right font-semibold text-[#287a28]">+{kg(after - before)}</dd>
    </dl>
  );
}
