"use client";

import { useState } from "react";
import { Camera, RotateCcw } from "lucide-react";
import {
  BarcodeViewfinder,
  CameraOffPlaceholder,
  ScanTips,
} from "@/components/scanner/barcode-viewfinder";
import {
  DECODER_ERROR,
  readFrame,
  useBarcodeScanner,
  type DetectedBarcode,
} from "@/lib/client/use-barcode-scanner";

function toPhotoUrl(frame: HTMLCanvasElement): string {
  return frame.toDataURL("image/jpeg", 0.9);
}

function formatLabel(format: string): string {
  return format.replaceAll("_", " ").toUpperCase();
}

export function CardScanner() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [readings, setReadings] = useState<DetectedBarcode[]>([]);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const scanner = useBarcodeScanner((read) => {
    setPhotoUrl(toPhotoUrl(read.frame));
    setReadings([{ value: read.value, format: read.format }]);
    return true;
  });

  const live = scanner.status !== "idle";
  const error = scanner.error ?? photoError;
  const done = !live && !readingPhoto && photoUrl !== null;

  function scan() {
    setPhotoUrl(null);
    setReadings([]);
    setPhotoError(null);
    void scanner.start();
  }

  /** Backup for when live scanning can't get a read: keeps the photo so it can be checked. */
  async function capture() {
    const photo = scanner.capture();
    if (!photo) {
      setPhotoError("The camera isn't ready yet. Wait a second and try again.");
      return;
    }
    setPhotoUrl(toPhotoUrl(photo));
    setPhotoError(null);
    setReadingPhoto(true);
    try {
      setReadings(await readFrame(photo));
    } catch {
      setPhotoError(DECODER_ERROR);
    }
    setReadingPhoto(false);
  }

  return (
    <section className="bg-smu-cream pb-20 pt-8">
      <div className="container-smu">
        <div className="mb-4 rounded border border-smu-gold/30 bg-smu-gold/10 px-3 py-2 text-[12px] text-smu-gold-dark">
          <strong className="font-semibold">Test page.</strong> Your photo and barcode stay in this
          browser tab. Nothing is uploaded or saved, and refreshing clears them.
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="overflow-hidden rounded-md border border-black/10 bg-white shadow-card">
            <BarcodeViewfinder
              videoRef={scanner.videoRef}
              status={scanner.status}
              mirrored={scanner.mirrored}
              showScanLine={!error}
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Captured student card" className="block h-auto w-full" />
              ) : (
                <CameraOffPlaceholder />
              )}
            </BarcodeViewfinder>

            <div className="flex flex-wrap gap-2 p-3">
              {scanner.status === "idle" && !readingPhoto && !done && (
                <button type="button" onClick={scan} className="btn-smu btn-smu-gold flex-1">
                  <Camera className="h-4 w-4" /> Open camera
                </button>
              )}
              {scanner.status === "starting" && (
                <button type="button" disabled className="btn-smu btn-smu-gold flex-1 opacity-50">
                  Starting camera…
                </button>
              )}
              {scanner.status === "scanning" && (
                <>
                  <button type="button" onClick={capture} className="btn-smu btn-smu-outline flex-1">
                    <Camera className="h-4 w-4" /> Capture photo
                  </button>
                  <button type="button" onClick={scanner.stop} className="btn-smu btn-smu-outline">
                    Stop
                  </button>
                </>
              )}
              {readingPhoto && (
                <button type="button" disabled className="btn-smu btn-smu-gold flex-1 opacity-50">
                  Reading barcode…
                </button>
              )}
              {done && (
                <button type="button" onClick={scan} className="btn-smu btn-smu-gold flex-1">
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

            {done &&
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

            {done && !error && readings.length === 0 && (
              <div className="text-[13px] leading-6 text-smu-muted">
                <p className="font-semibold text-smu-navy">No barcode found in this photo.</p>
                <p className="mt-1">Check the photo, then try again:</p>
                <ScanTips />
              </div>
            )}

            {readingPhoto && (
              <p className="text-[13px] text-smu-muted">Reading the barcode from your photo…</p>
            )}

            {scanner.status === "scanning" && !error && !scanner.showTips && (
              <p className="text-[13px] leading-6 text-smu-muted">
                Scanning… Hold the card steady with its barcode inside the box. It will read
                automatically.
              </p>
            )}

            {scanner.status === "scanning" && !error && scanner.showTips && (
              <div className="text-[13px] leading-6 text-smu-muted">
                <p className="font-semibold text-smu-navy">Still scanning, but no read yet.</p>
                <ScanTips />
                <p className="mt-2">
                  Or click Capture photo to take a picture and check it for blur or glare.
                </p>
              </div>
            )}

            {(scanner.status === "starting" || (scanner.status === "idle" && !photoUrl)) &&
              !error && (
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
