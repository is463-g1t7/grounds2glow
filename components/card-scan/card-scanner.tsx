"use client";

import { useEffect, useRef, useState } from "react";
import { Barcode, Camera, RotateCcw } from "lucide-react";

type Phase = "idle" | "starting" | "camera" | "reading" | "done";
type Reading = { value: string; format: string };

/** Where to hold the barcode, as fractions of the video frame. */
const GUIDE = { x: 0.1, y: 0.3, width: 0.8, height: 0.4 };
/** Pause between live scans, measured from when the previous scan finishes. */
const SCAN_INTERVAL_MS = 250;
/** How long live scanning runs without a read before tips appear. */
const TIPS_AFTER_MS = 10_000;

const DECODER_ERROR =
  "The barcode reader couldn't run. It downloads its decoder when first used, so check your internet connection and try again.";

// Loaded on demand: the decoder is only needed once the camera is in use.
async function createDetector() {
  const { BarcodeDetector } = await import("barcode-detector/ponyfill");
  return new BarcodeDetector({ formats: ["linear_codes"] });
}

/** Copies the current video frame. It comes from the raw video, so it isn't mirrored like the preview. */
function grabFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const frame = document.createElement("canvas");
  frame.width = video.videoWidth;
  frame.height = video.videoHeight;
  frame.getContext("2d")?.drawImage(video, 0, 0);
  return frame;
}

/** Enlarges the guide area, which helps when the barcode is small in the frame. */
function enlargeGuideArea(photo: HTMLCanvasElement): HTMLCanvasElement {
  const width = photo.width * GUIDE.width;
  const height = photo.height * GUIDE.height;
  const enlarged = document.createElement("canvas");
  enlarged.width = Math.round(width * 2);
  enlarged.height = Math.round(height * 2);
  const ctx = enlarged.getContext("2d");
  if (!ctx) return photo;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    photo,
    photo.width * GUIDE.x,
    photo.height * GUIDE.y,
    width,
    height,
    0,
    0,
    enlarged.width,
    enlarged.height,
  );
  return enlarged;
}

function toPhotoUrl(frame: HTMLCanvasElement): string {
  return frame.toDataURL("image/jpeg", 0.9);
}

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError") {
    return "Camera permission was blocked. Allow the camera in your browser's address bar, then try again.";
  }
  if (name === "NotFoundError") return "No camera was found on this device.";
  if (name === "NotReadableError") {
    return "The camera is being used by another app. Close that app, then try again.";
  }
  return "The camera couldn't start. Browsers only allow camera access on localhost or HTTPS.";
}

function formatLabel(format: string): string {
  return format.replaceAll("_", " ").toUpperCase();
}

function ScanTips() {
  return (
    <ul className="mt-1 list-disc pl-5">
      <li>If it&apos;s blurry, move the card further from the camera.</li>
      <li>If there&apos;s a bright patch on the barcode, tilt the card to remove it.</li>
      <li>Keep the barcode level and fully inside the box.</li>
    </ul>
  );
}

export function CardScanner() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);
  /** Identifies the running live scan. Changing it makes that scan stop. */
  const scanIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    const scanId = scanIdRef;
    return () => {
      mountedRef.current = false;
      scanId.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  function stopCamera() {
    scanIdRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function scanLive(video: HTMLVideoElement) {
    const scanId = ++scanIdRef.current;
    const isRunning = () => scanId === scanIdRef.current;
    const startedAt = Date.now();
    let lastValue: string | null = null;
    let useEnlarged = false;
    try {
      const detector = await createDetector();
      while (isRunning()) {
        const frame = grabFrame(video);
        const hits = await detector.detect(useEnlarged ? enlargeGuideArea(frame) : frame);
        if (!isRunning()) return;
        useEnlarged = !useEnlarged;

        // A blurry frame can misread, so only accept a value that reads the same twice.
        const confirmed = hits.find((hit) => hit.rawValue === lastValue);
        if (confirmed) {
          setPhotoUrl(toPhotoUrl(frame));
          setReadings([{ value: confirmed.rawValue, format: confirmed.format }]);
          stopCamera();
          setPhase("done");
          return;
        }
        if (hits[0]) lastValue = hits[0].rawValue;
        if (Date.now() - startedAt >= TIPS_AFTER_MS) setShowTips(true);
        await new Promise((resolve) => setTimeout(resolve, SCAN_INTERVAL_MS));
      }
    } catch {
      if (isRunning()) setError(DECODER_ERROR);
    }
  }

  async function startCamera() {
    setError(null);
    setReadings([]);
    setPhotoUrl(null);
    setShowTips(false);
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Line barcodes need detail, so ask for the sharpest image the camera offers.
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setPhase("camera");
      void scanLive(video);
    } catch (err) {
      stopCamera();
      setError(cameraErrorMessage(err));
      setPhase("idle");
    }
  }

  /** Backup for when live scanning can't get a read: keeps the photo so it can be checked. */
  async function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("The camera isn't ready yet. Wait a second and try again.");
      return;
    }
    const photo = grabFrame(video);
    setPhotoUrl(toPhotoUrl(photo));
    stopCamera();
    setError(null);
    setPhase("reading");
    try {
      const detector = await createDetector();
      let hits = await detector.detect(photo);
      if (hits.length === 0) hits = await detector.detect(enlargeGuideArea(photo));
      setReadings(hits.map((hit) => ({ value: hit.rawValue, format: hit.format })));
    } catch {
      setError(DECODER_ERROR);
    }
    setPhase("done");
  }

  const live = phase === "starting" || phase === "camera";

  return (
    <section className="bg-smu-cream pb-20 pt-8">
      <div className="container-smu">
        <div className="mb-4 rounded border border-smu-gold/30 bg-smu-gold/10 px-3 py-2 text-[12px] text-smu-gold-dark">
          <strong className="font-semibold">Test page.</strong> Your photo and barcode stay in this
          browser tab. Nothing is uploaded or saved, and refreshing clears them.
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="overflow-hidden rounded-md border border-black/10 bg-white shadow-card">
            <div className="relative overflow-hidden bg-smu-navy-deep">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`block h-auto w-full -scale-x-100 ${live ? "" : "hidden"}`}
              />

              {phase === "camera" && (
                <div
                  className="pointer-events-none absolute rounded border-2 border-smu-gold shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                  style={{
                    left: `${GUIDE.x * 100}%`,
                    top: `${GUIDE.y * 100}%`,
                    width: `${GUIDE.width * 100}%`,
                    height: `${GUIDE.height * 100}%`,
                  }}
                >
                  {!error && (
                    <span className="scanline absolute inset-x-2 h-0.5 bg-smu-gold shadow-[0_0_12px_2px_rgba(138,112,76,0.7)]" />
                  )}
                </div>
              )}

              {!live && photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Captured student card" className="block h-auto w-full" />
              )}

              {!live && !photoUrl && (
                <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <Barcode className="h-10 w-10 text-white/30" />
                  <p className="text-[13px] text-white/60">
                    Your camera stays off until you open it
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 p-3">
              {phase === "idle" && (
                <button type="button" onClick={startCamera} className="btn-smu btn-smu-gold flex-1">
                  <Camera className="h-4 w-4" /> Open camera
                </button>
              )}
              {phase === "starting" && (
                <button type="button" disabled className="btn-smu btn-smu-gold flex-1 opacity-50">
                  Starting camera…
                </button>
              )}
              {phase === "camera" && (
                <>
                  <button type="button" onClick={capture} className="btn-smu btn-smu-outline flex-1">
                    <Camera className="h-4 w-4" /> Capture photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setError(null);
                      setShowTips(false);
                      setPhase("idle");
                    }}
                    className="btn-smu btn-smu-outline"
                  >
                    Stop
                  </button>
                </>
              )}
              {phase === "reading" && (
                <button type="button" disabled className="btn-smu btn-smu-gold flex-1 opacity-50">
                  Reading barcode…
                </button>
              )}
              {phase === "done" && (
                <button type="button" onClick={startCamera} className="btn-smu btn-smu-gold flex-1">
                  <RotateCcw className="h-4 w-4" /> Scan again
                </button>
              )}
            </div>
          </section>

          <section
            aria-live="polite"
            className="flex flex-col gap-3 rounded-md border border-black/10 bg-white p-5 shadow-card"
          >
            <h2 className="font-display text-[24px] leading-8 text-smu-navy">Result</h2>

            {error && (
              <p className="rounded border border-smu-danger/20 bg-smu-danger/5 px-3 py-2 text-[13px] text-smu-danger">
                {error}
              </p>
            )}

            {phase === "done" &&
              readings.map((reading, i) => (
                <dl key={`${reading.value}-${i}`} className="flex flex-col gap-3">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[1px] text-smu-muted">
                      Barcode value
                    </dt>
                    <dd className="mt-1 break-all font-mono text-[22px] leading-8 text-smu-navy">
                      {reading.value}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[1px] text-smu-muted">
                      Barcode type
                    </dt>
                    <dd className="mt-1 text-[14px]">{formatLabel(reading.format)}</dd>
                  </div>
                </dl>
              ))}

            {phase === "done" && !error && readings.length === 0 && (
              <div className="text-[13px] leading-6 text-smu-muted">
                <p className="font-semibold text-smu-navy">No barcode found in this photo.</p>
                <p className="mt-1">Check the photo, then try again:</p>
                <ScanTips />
              </div>
            )}

            {phase === "reading" && (
              <p className="text-[13px] text-smu-muted">Reading the barcode from your photo…</p>
            )}

            {phase === "camera" && !error && !showTips && (
              <p className="text-[13px] leading-6 text-smu-muted">
                Scanning… Hold the card steady with its barcode inside the box. It will read
                automatically.
              </p>
            )}

            {phase === "camera" && !error && showTips && (
              <div className="text-[13px] leading-6 text-smu-muted">
                <p className="font-semibold text-smu-navy">Still scanning, but no read yet.</p>
                <ScanTips />
                <p className="mt-2">
                  Or click Capture photo to take a picture and check it for blur or glare.
                </p>
              </div>
            )}

            {(phase === "idle" || phase === "starting") && !error && (
              <p className="text-[13px] leading-6 text-smu-muted">
                Open the camera to get started.
              </p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
