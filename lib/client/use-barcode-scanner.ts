"use client";

import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/client/use-bootstrap";
import type { BarcodeMatch } from "@/lib/types";

export type BarcodeRead = { value: string; format: string; frame: HTMLCanvasElement };
export type DetectedBarcode = { value: string; format: string };

/** Where to hold the barcode, as fractions of the video frame. */
export const SCAN_GUIDE = { x: 0.1, y: 0.3, width: 0.8, height: 0.4 };
/** Pause between live scans, measured from when the previous scan finishes. */
const SCAN_INTERVAL_MS = 250;
/** How long live scanning runs without a read before tips appear. */
const TIPS_AFTER_MS = 10_000;

export const DECODER_ERROR =
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
function enlargeGuideArea(frame: HTMLCanvasElement): HTMLCanvasElement {
  const width = frame.width * SCAN_GUIDE.width;
  const height = frame.height * SCAN_GUIDE.height;
  const enlarged = document.createElement("canvas");
  enlarged.width = Math.round(width * 2);
  enlarged.height = Math.round(height * 2);
  const ctx = enlarged.getContext("2d");
  if (!ctx) return frame;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    frame,
    frame.width * SCAN_GUIDE.x,
    frame.height * SCAN_GUIDE.y,
    width,
    height,
    0,
    0,
    enlarged.width,
    enlarged.height,
  );
  return enlarged;
}

/** Reads a single photo, trying the whole frame and then the enlarged guide area. */
export async function readFrame(frame: HTMLCanvasElement): Promise<DetectedBarcode[]> {
  const detector = await createDetector();
  let hits = await detector.detect(frame);
  if (hits.length === 0) hits = await detector.detect(enlargeGuideArea(frame));
  return hits.map((hit) => ({ value: hit.rawValue, format: hit.format }));
}

/** Asks the server who a barcode belongs to. The list of valid cards never reaches the browser. */
export async function lookupBarcode(code: string): Promise<BarcodeMatch | null> {
  const { match } = await apiRequest<{ match: BarcodeMatch | null }>("/api/barcode/resolve", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return match;
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

/**
 * Runs the camera and scans it for line barcodes until `onRead` accepts one.
 * Returning false from `onRead` keeps scanning and ignores that value until the next scan.
 */
export function useBarcodeScanner(onRead: (read: BarcodeRead) => boolean | Promise<boolean>) {
  const [status, setStatus] = useState<"idle" | "starting" | "scanning">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [mirrored, setMirrored] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);
  /** Identifies the running live scan. Changing it makes that scan stop. */
  const scanIdRef = useRef(0);
  const onReadRef = useRef(onRead);

  useEffect(() => {
    onReadRef.current = onRead;
  });

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
    const rejected = new Set<string>();
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
        if (confirmed && !rejected.has(confirmed.rawValue)) {
          const accepted = await onReadRef.current({
            value: confirmed.rawValue,
            format: confirmed.format,
            frame,
          });
          if (!isRunning()) return;
          if (accepted) {
            stopCamera();
            setStatus("idle");
            return;
          }
          rejected.add(confirmed.rawValue);
        }
        if (hits[0]) lastValue = hits[0].rawValue;
        if (Date.now() - startedAt >= TIPS_AFTER_MS) setShowTips(true);
        await new Promise((resolve) => setTimeout(resolve, SCAN_INTERVAL_MS));
      }
    } catch {
      if (isRunning()) setError(DECODER_ERROR);
    }
  }

  async function start() {
    setError(null);
    setShowTips(false);
    setStatus("starting");
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
      // A front camera feels natural as a mirror. A phone's rear camera would look backwards.
      setMirrored(stream.getVideoTracks()[0]?.getSettings().facingMode !== "environment");
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setStatus("scanning");
      void scanLive(video);
    } catch (err) {
      stopCamera();
      setError(cameraErrorMessage(err));
      setStatus("idle");
    }
  }

  function stop() {
    stopCamera();
    setError(null);
    setShowTips(false);
    setStatus("idle");
  }

  /** Stops the camera and returns the current frame, or null if the video isn't ready yet. */
  function capture(): HTMLCanvasElement | null {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const frame = grabFrame(video);
    stop();
    return frame;
  }

  return { videoRef, status, error, showTips, mirrored, start, stop, capture };
}
