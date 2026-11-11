import type { OcrLine } from "./languages";
import type { ScaleReading, ScaleUnit } from "./scale-reading";

/**
 * A phone at the bin takes the photo of the scale for the laptop. The laptop and the phone share a
 * capture session, set up once with a pairing code. Picking a level on the laptop posts a job; the
 * phone takes the photo, reads it with OCR, and posts the result back. The laptop saves it.
 */

/** Header that carries the capture session's secret. */
export const SESSION_HEADER = "x-capture-session";

/** How long a pairing code works. */
export const PAIR_CODE_SECONDS = 10 * 60;

/**
 * - `waiting`: posted by the laptop, not yet picked up by the phone.
 * - `capturing`: the phone has it and is counting down to the photo.
 * - `reading`: the photo is taken (its preview is on the job) and is being read.
 * - `done`: the result is on the job. `failed`: the phone couldn't take or read the photo.
 */
export type CaptureStatus = "waiting" | "capturing" | "reading" | "done" | "failed";

export type CaptureResult = {
  /** Text OCR found, with boxes in `preview` pixels. */
  lines: OcrLine[];
  reading: ScaleReading | null;
  /** How long the OCR took, in ms. */
  ms: number;
};

export type CaptureJob = {
  id: string;
  binId: string;
  binShort: string;
  level: number;
  /** The station scale's unit, for readings whose unit OCR can't see. */
  unit: ScaleUnit;
  capacityKg: number;
  status: CaptureStatus;
  createdAt: string;
  /** A small JPEG data URL of the photo, for the laptop to show. Not stored with the reading. */
  preview: string | null;
  result: CaptureResult | null;
  error: string | null;
};

/** What the laptop sends to start a capture. */
export type CaptureRequest = Pick<CaptureJob, "binId" | "binShort" | "level" | "unit" | "capacityKg">;

export type PairStatus = {
  /** A phone has joined with a code. */
  paired: boolean;
  /** When the latest phone joined, so the laptop can tell a new pairing from an old one. */
  pairedAt: string | null;
  /** The phone checked in within the last few seconds. */
  phoneOnline: boolean;
  station: string | null;
};
