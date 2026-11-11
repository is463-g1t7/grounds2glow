"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import { Camera, CheckCircle2, Pause, Smartphone, TriangleAlert, Unlink } from "lucide-react";
import {
  CaptureError,
  checkForCapture,
  claimCapture,
  joinPairing,
  reportCapture,
  setCaptureSession,
  unpairSession,
  useCaptureSession,
} from "@/lib/client/capture";
import { grabFrame, useCamera } from "@/lib/client/camera";
import { padRect, readScaleWhenAwake, warmOcr, type Rect } from "@/lib/client/scale-ocr";
import type { CaptureJob } from "@/lib/capture-types";
import type { OcrLine } from "@/lib/languages";

/** How often the phone asks for work. */
const POLL_MS = 1_200;
/** Every this many checks also tells the laptop the phone is online. */
const BEAT_EVERY = 5;
/** Seconds counted down before the photo, so hands are clear of the scale. */
const COUNTDOWN = 3;
/** With nothing to do for this long, the phone pauses to save battery and data. */
const IDLE_PAUSE_MS = 15 * 60_000;
/** Longest side of the photo sent to the laptop to show. */
const PREVIEW_SIDE = 1280;
/** The frame drawn over the camera view for the scale display, as fractions of the view. */
const GUIDE: Rect = { x: 0.09, y: 0.31, w: 0.82, h: 0.38 };
/** Stays under the relay's 900 kB preview limit. */
const MAX_PREVIEW_CHARS = 850_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The phone on a stand at the bin. Once paired with the bin's laptop, it waits with the camera on.
 * When a cleaner picks a pantry level on the laptop, it counts down, photographs the scale, reads
 * the display with OCR and sends the result to the laptop, which logs it.
 */
export function PhoneCamera() {
  const sid = useCaptureSession("phone");
  if (sid === undefined) return <Screen>{null}</Screen>;
  if (!sid) return <JoinForm />;
  return <ArmedCamera key={sid} sid={sid} />;
}

function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-smu-navy-deep text-white">
      <header className="bg-smu-navy">
        <div className="h-1 bg-smu-gold" />
        <div className="flex items-center gap-3 px-4 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/smu-logo-white.svg" alt="SMU" className="h-8 w-auto" />
          <span className="h-8 w-px bg-white/20" />
          <p className="font-display text-[20px] leading-6">Scale camera</p>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      {footer}
    </div>
  );
}

// ----- Pairing -----

function JoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const fromLink = (params.get("code") ?? "").replace(/\D/g, "").slice(0, 6);
  const [code, setCode] = useState(fromLink);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join(value: string) {
    setJoining(true);
    setError(null);
    try {
      const { session } = await joinPairing(value);
      // Drop the used code from the address, so a reload doesn't try it again.
      router.replace("/cleaner/camera");
      setCaptureSession("phone", session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pairing failed. Try again.");
      setJoining(false);
    }
  }

  // A code from the laptop's QR code pairs straight away.
  const joinFromLink = useEffectEvent(() => void join(fromLink));
  useEffect(() => {
    if (fromLink.length !== 6) return;
    // After this render, and once even when React runs effects twice in development.
    const timer = window.setTimeout(joinFromLink, 0);
    return () => window.clearTimeout(timer);
  }, [fromLink]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (code.length === 6) void join(code);
  }

  return (
    <Screen>
      <form onSubmit={submit} className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 px-5 py-8">
        <Smartphone className="h-12 w-12 text-smu-gold-light" />
        <h1 className="font-display text-[32px] leading-10">Pair with the bin&apos;s laptop</h1>
        <p className="text-[17px] leading-7 text-white/80">
          On the laptop, open <span className="font-semibold text-white">Phone camera setup</span> and
          choose Pair a phone. Enter the code it shows.
        </p>
        <label htmlFor="pair-code" className="text-[16px] font-semibold">
          Pairing code
        </label>
        <input
          id="pair-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="000 000"
          autoFocus={!fromLink}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          aria-invalid={error ? true : undefined}
          className="h-20 w-full rounded border border-white/25 bg-white/5 px-4 text-center font-display text-[44px] tracking-[0.3em] tabular-nums text-white placeholder:text-white/30 focus:border-smu-gold focus:outline-none focus:ring-2 focus:ring-smu-gold/40"
        />
        {error && (
          <p className="text-[16px] font-semibold text-[#ffb4ad]" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={code.length !== 6 || joining}
          className="btn-smu btn-smu-gold cleaner-action disabled:cursor-not-allowed disabled:opacity-45"
        >
          {joining ? "Pairing…" : "Pair"}
        </button>
      </form>
    </Screen>
  );
}

// ----- Waiting for the laptop -----

type Mode =
  | { kind: "ready" }
  | { kind: "countdown"; job: CaptureJob; n: number }
  | { kind: "reading"; job: CaptureJob; waking: boolean }
  | { kind: "sent"; job: CaptureJob; text: string }
  | { kind: "error"; message: string }
  | { kind: "paused" };

function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

function useVisible(): boolean {
  return useSyncExternalStore(subscribeVisibility, () => document.visibilityState === "visible", () => true);
}

function ArmedCamera({ sid }: { sid: string }) {
  const {
    videoRef,
    status: cameraStatus,
    error: cameraError,
    mirrored,
    start: startCamera,
    stop: stopCamera,
  } = useCamera();
  const visible = useVisible();
  const [armed, setArmed] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: "ready" });
  const [flash, setFlash] = useState(false);
  const [offline, setOffline] = useState(false);
  const mounted = useRef(true);
  const lastWork = useRef(0);

  useEffect(() => {
    mounted.current = true;
    warmOcr();
    return () => {
      mounted.current = false;
    };
  }, []);

  const live = cameraStatus === "live";
  const waitingForWork = armed && live && visible && mode.kind === "ready";

  // Keep the screen on while armed, so the camera keeps running.
  useEffect(() => {
    if (!armed || !visible || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let released = false;
    navigator.wakeLock
      .request("screen")
      .then((l) => {
        if (released) void l.release();
        else lock = l;
      })
      .catch(() => {});
    return () => {
      released = true;
      void lock?.release();
    };
  }, [armed, visible]);

  // Phones end the camera stream when the page is hidden. Start a fresh one on return.
  const restartCamera = useEffectEvent(() => {
    if (!armed || mode.kind === "paused") return;
    stopCamera();
    void startCamera();
  });
  useEffect(() => {
    if (visible) restartCamera();
  }, [visible]);

  async function arm() {
    lastWork.current = Date.now();
    setArmed(true);
    setMode({ kind: "ready" });
    await startCamera();
  }

  async function capture(job: CaptureJob) {
    lastWork.current = Date.now();
    setMode({ kind: "countdown", job, n: COUNTDOWN });
    try {
      const claimed = await claimCapture(sid, job.id);
      if (!claimed) {
        setMode({ kind: "ready" });
        return;
      }
      for (let n = COUNTDOWN; n > 0; n--) {
        if (!mounted.current) return;
        setMode({ kind: "countdown", job, n });
        await sleep(1_000);
      }
      const video = videoRef.current;
      if (!video || !video.videoWidth) throw new Error("The camera wasn't ready. Retake the photo on the laptop.");
      const frame = grabFrame(video);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 350);

      const preview = makePreview(frame);
      if (!(await reportCapture(sid, job.id, { action: "captured", preview: preview.dataUrl }))) {
        setMode({ kind: "ready" });
        return;
      }
      setMode({ kind: "reading", job, waking: false });

      // Read only the framed part, so other text in view (labels, the laptop) isn't mistaken for the weight.
      const result = await readScaleWhenAwake(frame, guideInFrame(video), {
        isCurrent: () => mounted.current,
        onWaking: () => setMode({ kind: "reading", job, waking: true }),
        unit: job.unit,
        capacityKg: job.capacityKg,
      });
      if (!result) return;
      // Boxes come back in the full photo's pixels. The laptop shows the preview.
      const lines: OcrLine[] = result.lines.map((line) => ({
        text: line.text,
        box: line.box.map(([x, y]) => [x * preview.scale, y * preview.scale]),
      }));
      await reportCapture(sid, job.id, {
        action: "result",
        result: { lines, reading: result.reading, ms: result.ms },
      });
      if (!mounted.current) return;
      const reading = result.reading;
      setMode({
        kind: "sent",
        job,
        text: reading
          ? `Read ${reading.unit === "g" ? `${reading.value} g` : `${reading.value} kg`}. The laptop is logging it.`
          : "No weight found on the display. The laptop will ask what to do.",
      });
      lastWork.current = Date.now();
      await sleep(3_500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "The photo couldn't be read.";
      await reportCapture(sid, job.id, { action: "failed", error: message }).catch(() => undefined);
      if (!mounted.current) return;
      setMode({ kind: "error", message });
      await sleep(4_000);
    }
    if (mounted.current) setMode({ kind: "ready" });
  }

  const onJob = useEffectEvent((job: CaptureJob) => void capture(job));
  const onUnpaired = useEffectEvent(() => setCaptureSession("phone", null));
  const onIdle = useEffectEvent(() => {
    stopCamera();
    setMode({ kind: "paused" });
  });

  // Ask for work while the camera is ready.
  useEffect(() => {
    if (!waitingForWork) return;
    let stopped = false;
    let checks = 0;
    if (!lastWork.current) lastWork.current = Date.now();
    void (async () => {
      while (!stopped) {
        try {
          const job = await checkForCapture(sid, checks++ % BEAT_EVERY === 0);
          if (stopped) return;
          setOffline(false);
          if (job) {
            onJob(job);
            return;
          }
        } catch (err) {
          if (stopped) return;
          if (err instanceof CaptureError && (err.status === 404 || err.status === 401)) {
            onUnpaired();
            return;
          }
          setOffline(true);
        }
        if (Date.now() - lastWork.current > IDLE_PAUSE_MS) {
          onIdle();
          return;
        }
        await sleep(POLL_MS);
      }
    })();
    return () => {
      stopped = true;
    };
  }, [waitingForWork, sid]);

  async function unpair() {
    await unpairSession(sid).catch(() => undefined);
    stopCamera();
    setCaptureSession("phone", null);
  }

  const busy = mode.kind === "countdown" || mode.kind === "reading";

  const footer = (
    <footer className="flex items-center justify-between gap-4 bg-smu-navy px-4 py-3 text-[14px] text-white/70">
      <span className="flex items-center gap-2" role="status">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            !armed || !live ? "bg-white/40" : offline ? "bg-[#ff8a80]" : "bg-smu-success"
          }`}
        />
        {!armed || !live ? "Camera off" : offline ? "No connection, retrying…" : "Connected to the laptop"}
      </span>
      {!busy && (
        <button type="button" onClick={() => void unpair()} className="flex items-center gap-1.5 font-semibold hover:text-white">
          <Unlink className="h-4 w-4" /> Unpair
        </button>
      )}
    </footer>
  );

  return (
    <Screen footer={footer}>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover ${mirrored ? "-scale-x-100" : ""} ${
            live ? "opacity-100" : "opacity-0"
          }`}
        />

        {live && mode.kind !== "paused" && (
          <div
            aria-hidden
            className="pointer-events-none absolute rounded-lg border-2 border-dashed border-white/70"
            style={{
              left: `${GUIDE.x * 100}%`,
              top: `${GUIDE.y * 100}%`,
              width: `${GUIDE.w * 100}%`,
              height: `${GUIDE.h * 100}%`,
            }}
          />
        )}

        {flash && <span className="shutter pointer-events-none absolute inset-0 bg-white" />}

        <div className="relative z-10 flex w-full flex-col items-center gap-4 px-6 text-center">
          {!armed || mode.kind === "paused" ? (
            <Overlay>
              {mode.kind === "paused" ? (
                <Pause className="h-12 w-12 text-smu-gold-light" />
              ) : (
                <Camera className="h-12 w-12 text-smu-gold-light" />
              )}
              <p className="font-display text-[30px] leading-9">
                {mode.kind === "paused" ? "Paused to save battery" : "Point the phone at the scale"}
              </p>
              <p className="max-w-sm text-[16px] leading-6 text-white/80">
                {mode.kind === "paused"
                  ? "Nothing happened for a while. Tap to switch the camera back on."
                  : "Put the phone on its stand with the scale display in view, then switch the camera on. Keep this page open."}
              </p>
              <button type="button" onClick={() => void arm()} className="btn-smu btn-smu-gold cleaner-action max-w-xs">
                <Camera className="h-5 w-5" /> Switch the camera on
              </button>
            </Overlay>
          ) : cameraError ? (
            <Overlay>
              <TriangleAlert className="h-12 w-12 text-[#ffb4ad]" />
              <p className="max-w-sm text-[17px] leading-7">{cameraError}</p>
              <button type="button" onClick={() => void startCamera()} className="btn-smu btn-smu-gold cleaner-action max-w-xs">
                Try again
              </button>
            </Overlay>
          ) : mode.kind === "countdown" ? (
            <div className="flex flex-col items-center gap-2" role="status">
              <p className="rounded bg-black/60 px-3 py-1 text-[16px] font-semibold">
                {mode.job.binShort} bin · Level {mode.job.level}
              </p>
              <p className="font-display text-[140px] leading-none [text-shadow:0_4px_24px_rgb(0_0_0/0.7)]">
                {mode.n}
              </p>
              <p className="rounded bg-black/60 px-3 py-1 text-[16px]">Hands off the scale</p>
            </div>
          ) : mode.kind === "reading" ? (
            <Overlay>
              <span className="h-4 w-4 animate-pulse rounded-full bg-smu-gold" />
              <p className="font-display text-[28px] leading-9">Reading the display…</p>
              {mode.waking && (
                <p className="text-[16px] text-white/80">The reader is starting up. This can take up to a minute.</p>
              )}
            </Overlay>
          ) : mode.kind === "sent" ? (
            <Overlay>
              <CheckCircle2 className="h-12 w-12 text-smu-success" />
              <p className="font-display text-[28px] leading-9">Sent to the laptop</p>
              <p className="text-[16px] text-white/85">{mode.text}</p>
            </Overlay>
          ) : mode.kind === "error" ? (
            <Overlay>
              <TriangleAlert className="h-12 w-12 text-[#ffb4ad]" />
              <p className="font-display text-[26px] leading-8">Couldn&apos;t read the scale</p>
              <p className="max-w-sm text-[16px] text-white/85">{mode.message}</p>
            </Overlay>
          ) : live ? (
            <p className="absolute top-4 rounded bg-black/60 px-3 py-1.5 text-[15px]" role="status">
              Ready · keep the scale display inside the frame
            </p>
          ) : (
            <p className="text-[16px] text-white/80" role="status">
              Starting the camera…
            </p>
          )}
        </div>
      </div>
    </Screen>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="fade-up flex w-full max-w-md flex-col items-center gap-4 rounded-lg bg-black/65 px-6 py-8 backdrop-blur-sm">
      {children}
    </div>
  );
}

/**
 * Where the on-screen guide falls in the camera's own frame, with a margin, as fractions of the
 * frame. The view crops the video to fill the screen (object-cover), so the two don't match.
 */
function guideInFrame(video: HTMLVideoElement): Rect | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const ew = video.clientWidth;
  const eh = video.clientHeight;
  if (!vw || !vh || !ew || !eh) return null;
  const scale = Math.max(ew / vw, eh / vh);
  const offsetX = (vw * scale - ew) / 2;
  const offsetY = (vh * scale - eh) / 2;
  const rect: Rect = {
    x: (GUIDE.x * ew + offsetX) / scale / vw,
    y: (GUIDE.y * eh + offsetY) / scale / vh,
    w: (GUIDE.w * ew) / scale / vw,
    h: (GUIDE.h * eh) / scale / vh,
  };
  return padRect(rect, 0.1);
}

/** A smaller JPEG of the photo for the laptop to show, and how much it was scaled. */
function makePreview(frame: HTMLCanvasElement): { dataUrl: string; scale: number } {
  for (const [side, quality] of [
    [PREVIEW_SIDE, 0.8],
    [960, 0.7],
    [720, 0.6],
  ] as const) {
    const scale = Math.min(1, side / Math.max(frame.width, frame.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(frame.width * scale);
    canvas.height = Math.round(frame.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= MAX_PREVIEW_CHARS) return { dataUrl, scale };
  }
  throw new Error("This phone can't prepare the photo.");
}
