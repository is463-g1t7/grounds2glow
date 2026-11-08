"use client";

import type { OcrLine } from "@/lib/languages";
import type { ScaleReading, ScaleUnit } from "@/lib/scale-reading";

/** Part of an image, as fractions of its width and height. */
export type Rect = { x: number; y: number; w: number; h: number };

/** The OCR service is asleep or starting. It wakes on request, so try again shortly. */
export class OcrWakingError extends Error {}

/** Longest side sent to the OCR service. Keeps uploads small and well under the 4 MB limit. */
const MAX_SIDE = 1600;

/** Grows a rect by `margin` of its size on each side, kept inside the image. */
export function padRect(rect: Rect, margin: number): Rect {
  const x = Math.max(0, rect.x - rect.w * margin);
  const y = Math.max(0, rect.y - rect.h * margin);
  return {
    x,
    y,
    w: Math.min(1 - x, rect.w * (1 + 2 * margin)),
    h: Math.min(1 - y, rect.h * (1 + 2 * margin)),
  };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't open this image. Use a JPEG, PNG or WebP photo."));
    img.src = src;
  });
}

export function imageSize(source: HTMLImageElement | HTMLCanvasElement) {
  return source instanceof HTMLImageElement
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

/**
 * Sends the scale display to the OCR service and returns what it read.
 * Only `crop` is uploaded (or the whole image when it's null). Boxes come back in full-image pixels.
 */
export type ReadOptions = {
  /** The station scale's unit, used when the display's own unit can't be read. */
  unit?: ScaleUnit | null;
  /** The bin's capacity: a unitless reading too heavy for it is read as grams. */
  capacityKg?: number;
};

export type ScaleResult = { lines: OcrLine[]; kg: number | null; reading: ScaleReading | null };

export async function readScale(
  source: HTMLImageElement | HTMLCanvasElement,
  crop: Rect | null,
  options: ReadOptions = {},
): Promise<ScaleResult> {
  const { width, height } = imageSize(source);
  const area = crop ?? { x: 0, y: 0, w: 1, h: 1 };
  const left = Math.round(area.x * width);
  const top = Math.round(area.y * height);
  const cropWidth = Math.round(area.w * width);
  const cropHeight = Math.round(area.h * height);
  const scale = Math.min(1, MAX_SIDE / Math.max(cropWidth, cropHeight));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cropWidth * scale);
  canvas.height = Math.round(cropHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't prepare the photo.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, left, top, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("This browser can't prepare the photo.");

  const form = new FormData();
  form.append("image", new File([blob], "scale.jpg", { type: "image/jpeg" }));
  if (options.unit) form.append("unit", options.unit);
  if (options.capacityKg != null) form.append("capacityKg", String(options.capacityKg));
  const res = await fetch("/api/ocr/scale", { method: "POST", body: form, cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as {
    lines?: OcrLine[];
    kg?: number | null;
    reading?: ScaleReading | null;
    error?: string;
    waking?: boolean;
  };
  if (res.status === 503 && body.waking) throw new OcrWakingError(body.error);
  if (!res.ok || !body.lines) throw new Error(body.error ?? `OCR failed (${res.status}).`);

  return {
    lines: body.lines.map((line) => ({
      text: line.text,
      box: line.box.map(([x, y]) => [left + x / scale, top + y / scale]),
    })),
    kg: body.kg ?? null,
    reading: body.reading ?? null,
  };
}

/** How long to keep retrying while the OCR service wakes up, and how often. */
const WAKE_RETRY_MS = 120_000;
const WAKE_RETRY_EVERY_MS = 8_000;

/**
 * Like `readScale`, but keeps retrying while the OCR service wakes up.
 * Returns null once `isCurrent` turns false, so a cancelled read stops quietly.
 */
export async function readScaleWhenAwake(
  source: HTMLImageElement | HTMLCanvasElement,
  crop: Rect | null,
  {
    isCurrent,
    onWaking,
    ...options
  }: ReadOptions & { isCurrent: () => boolean; onWaking: () => void },
): Promise<(ScaleResult & { ms: number }) | null> {
  const started = Date.now();
  for (;;) {
    try {
      const result = await readScale(source, crop, options);
      return isCurrent() ? { ...result, ms: Date.now() - started } : null;
    } catch (err) {
      if (!isCurrent()) return null;
      if (!(err instanceof OcrWakingError) || Date.now() - started > WAKE_RETRY_MS) throw err;
      onWaking();
      await new Promise((resolve) => setTimeout(resolve, WAKE_RETRY_EVERY_MS));
      if (!isCurrent()) return null;
    }
  }
}

let warmed = false;

/** Starts waking the OCR service in the background, once per page load. */
export function warmOcr() {
  if (warmed) return;
  warmed = true;
  void fetch("/api/ocr/warm", { method: "POST", cache: "no-store" }).catch(() => {
    warmed = false;
  });
}
