"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Camera, Check } from "lucide-react";
import { useBootstrap } from "@/lib/client/use-bootstrap";
import type { Cleaner } from "@/lib/types";
import { CleanerShell, StepColumns } from "./cleaner-shell";

// Shape-detection API: Chrome on Android/macOS/ChromeOS. Not in TS's DOM lib yet.
type Detector = { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

type Phase = "ready" | "camera" | "presenting" | "verified";

const noSubscribe = () => () => {};

/** Demo pass QR images: each encodes the cleaner's pass number (see public/passes/). */
export function passQrSrc(c: Pick<Cleaner, "pass">): string {
  return `/passes/${c.pass}.svg`;
}

export function PassScanner() {
  const router = useRouter();
  const { data, loading } = useBootstrap();
  const cleaners = data.cleaners;
  const [phase, setPhase] = useState<Phase>("ready");
  const [cleaner, setCleaner] = useState<Cleaner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canDetect = useSyncExternalStore(
    noSubscribe,
    () => "BarcodeDetector" in window,
    () => false,
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => {
      t.forEach(clearTimeout);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
    };
  }, []);

  function cleanerByPass(code: string): Cleaner | undefined {
    const norm = code.trim().toUpperCase();
    return cleaners.find((c) => c.pass === norm);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function verify(c: Cleaner, animate: boolean) {
    stopCamera();
    setError(null);
    setCleaner(c);
    setPhase(animate ? "presenting" : "verified");
    const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    if (animate) later(1100, () => setPhase("verified"));
    later(animate ? 2300 : 1200, () => router.push(`/cleaner/building?cleaner=${c.id}`));
  }

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setPhase("camera");
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      const Ctor = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
      const detector = new Ctor({ formats: ["qr_code"] });
      const tick = async () => {
        if (!streamRef.current) return;
        try {
          const [hit] = await detector.detect(video);
          if (hit) {
            const c = cleanerByPass(hit.rawValue);
            if (c) return verify(c, false);
            setError(`Pass not recognised: ${hit.rawValue}`);
          }
        } catch {
          // frame not ready yet
        }
        timers.current.push(window.setTimeout(tick, 300));
      };
      tick();
    } catch {
      setPhase("ready");
      setError("Camera unavailable. Tap a demo pass below instead.");
    }
  }

  const busy = phase === "presenting" || phase === "verified";

  return (
    <CleanerShell step={1}>
      <StepColumns
        narrowMain
        main={
          <section className="overflow-hidden rounded-md border border-black/10 bg-white shadow-card">
            <div className="relative aspect-square bg-smu-navy-deep">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`absolute inset-0 h-full w-full object-cover ${phase === "camera" ? "" : "hidden"}`}
              />

              {/* Viewfinder brackets + sweeping scan line */}
              <div className="pointer-events-none absolute inset-[12%]">
                {[
                  "left-0 top-0 border-l-4 border-t-4",
                  "right-0 top-0 border-r-4 border-t-4",
                  "bottom-0 left-0 border-b-4 border-l-4",
                  "bottom-0 right-0 border-b-4 border-r-4",
                ].map((c) => (
                  <span
                    key={c}
                    className={`absolute h-10 w-10 rounded-sm ${
                      phase === "verified" ? "border-smu-success" : "border-smu-gold"
                    } ${c}`}
                  />
                ))}
                {phase !== "verified" && (
                  <span className="scanline absolute inset-x-2 h-0.5 bg-smu-gold shadow-[0_0_12px_2px_rgba(138,112,76,0.7)]" />
                )}
              </div>

              {phase === "ready" && (
                <p className="absolute inset-x-0 bottom-5 text-center text-[13px] text-white/60">
                  Hold your staff pass inside the frame
                </p>
              )}

              {cleaner && busy && (
                <div className="absolute inset-0 grid place-items-center p-[18%]">
                  <PassCard cleaner={cleaner} className="w-full" />
                </div>
              )}

              {phase === "verified" && cleaner && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-smu-navy/90 text-white">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-smu-success">
                    <Check className="h-7 w-7" />
                  </span>
                  <p className="font-display text-[22px] leading-7">Pass verified</p>
                  <p className="text-[13px] text-white/80">
                    {cleaner.name} · {cleaner.pass}
                  </p>
                  <p className="text-[11px] text-white/50">Opening pantry picker…</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 p-3 empty:hidden">
              {canDetect && phase !== "camera" && !busy && (
                <button type="button" onClick={startCamera} className="btn-smu btn-smu-gold">
                  <Camera className="h-4 w-4" /> Scan with camera
                </button>
              )}
              {phase === "camera" && (
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setPhase("ready");
                  }}
                  className="btn-smu btn-smu-outline"
                >
                  Stop camera
                </button>
              )}
              {error && (
                <p className="rounded border border-smu-danger/20 bg-smu-danger/5 px-3 py-2 text-[13px] text-smu-danger">
                  {error}
                </p>
              )}
            </div>
          </section>
        }
        side={
          <section className="flex flex-col gap-2 lg:gap-3">
            <div className="hidden lg:block">
              <h1 className="font-display text-[32px] leading-10 text-smu-navy">
                Scan your staff pass
              </h1>
              <p className="mt-1 text-[14px] leading-6 text-smu-muted">
                Your pass signs every drop-off, so the bin&apos;s audit trail shows who emptied
                which pantry and when.
              </p>
            </div>
            <div className="flex items-baseline justify-between lg:mt-2">
              <h2 className="font-display text-[22px] leading-7 text-smu-navy">Demo passes</h2>
              <Link href="/passes" className="text-[12px] text-smu-muted underline underline-offset-2">
                Printable passes →
              </Link>
            </div>
            <p className="text-[12px] text-smu-muted">
              Tap a pass to present it to the scanner
              {canDetect ? ", or show a printed QR to the camera." : "."}
            </p>
            {loading ? (
              <p className="text-[13px] text-smu-muted">Loading passes…</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 lg:gap-3">
                {cleaners.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={busy}
                    onClick={() => verify(c, true)}
                    className="flex items-center gap-2 rounded-md border border-black/10 bg-white p-2 text-left shadow-card transition-colors hover:border-smu-gold disabled:opacity-50 lg:gap-3 lg:p-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={passQrSrc(c)}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded lg:h-16 lg:w-16"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-smu-navy">
                        {c.name}
                      </span>
                      <span className="block text-[11px] tabular-nums text-smu-muted">
                        {c.pass} · {c.shift}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        }
      />
    </CleanerShell>
  );
}

export function PassCard({ cleaner, className = "" }: { cleaner: Cleaner; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-md bg-white text-black shadow-2xl ${className}`}>
      <div className="flex items-center justify-between bg-smu-navy px-3 py-1.5 text-[10px] font-semibold tracking-[0.15em] text-smu-gold-light">
        <span>SMU · STAFF PASS</span>
        <span className="text-white/70">{cleaner.shift} SHIFT</span>
      </div>
      <div className="flex items-center gap-3 p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={passQrSrc(cleaner)}
          alt={`QR code for ${cleaner.pass}`}
          className="w-2/5 rounded"
        />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-smu-navy">{cleaner.name}</p>
          <p className="text-[11.5px] text-smu-muted">{cleaner.vendor}</p>
          <p className="mt-1 font-mono text-[11.5px] tabular-nums text-black/70">{cleaner.pass}</p>
        </div>
      </div>
    </div>
  );
}
