import "server-only";

import { Client } from "@gradio/client";
import type { Box, OcrLine } from "./languages";

/** The Hugging Face Space that runs PaddleOCR. */
const SPACE_ID = process.env.HF_SPACE_ID || "kevansoon/PaddleOCR";
/** Only needed if the Space is private. */
const HF_TOKEN = process.env.HF_TOKEN as `hf_${string}` | undefined;
/** Two attempts must fit inside the OCR route's 60-second limit. */
const ATTEMPT_MS = 25_000;
/** Stages where the Space is on its way up and worth retrying soon. */
const STARTING_STAGES = new Set(["SLEEPING", "STOPPED", "BUILDING", "APP_STARTING", "RUNNING_BUILDING"]);

/** The Space is asleep or starting. It wakes on request, so try again shortly. */
export class OcrWakingError extends Error {}
/** The Space answered with an error, or couldn't be reached. */
export class OcrUpstreamError extends Error {}

// Client.connect() fetches the Space config, which also wakes a sleeping Space.
// Reuse one connection per server instance.
let clientPromise: Promise<Client> | null = null;

function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = Client.connect(SPACE_ID, HF_TOKEN ? { token: HF_TOKEN } : {});
    clientPromise.catch(() => {
      clientPromise = null;
    });
  }
  return clientPromise;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * What Gradio reports when the Space's own code raises. The Space's code raises when PaddleOCR
 * finds no text at all, so this means "no text" rather than an outage.
 */
const NO_TEXT_ERROR = "An error occurred";

/** Reads the text in an image. Throws OcrWakingError while the Space is starting up. */
export async function runOcr(image: Blob): Promise<OcrLine[]> {
  try {
    return await withTimeout(predict(image), ATTEMPT_MS);
  } catch (err) {
    if (describe(err) === NO_TEXT_ERROR) return [];
    // The Space may have restarted or gone to sleep: reconnect once and retry.
    clientPromise = null;
    try {
      return await withTimeout(predict(image), ATTEMPT_MS);
    } catch (retryErr) {
      if (describe(retryErr) === NO_TEXT_ERROR) return [];
      throw await classify(retryErr);
    }
  }
}

/** Connects to the Space so it starts waking up before anyone needs it. */
export async function warmOcr(): Promise<{ ready: boolean; stage: string | null }> {
  try {
    await withTimeout(getClient(), ATTEMPT_MS);
    return { ready: true, stage: "RUNNING" };
  } catch {
    clientPromise = null;
    return { ready: false, stage: await spaceStage() };
  }
}

async function predict(image: Blob): Promise<OcrLine[]> {
  const client = await getClient();
  const result = await client.predict("/predict", { img: image, lang: "en" });
  return normalize((result.data as unknown[])[0]);
}

function normalize(raw: unknown): OcrLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): OcrLine[] => {
    if (!item || typeof item !== "object") return [];
    const { text, box } = item as { text?: unknown; box?: unknown };
    if (typeof text !== "string" || !Array.isArray(box)) return [];
    return [{ text, box: box.map((p) => [Number(p[0]), Number(p[1])]) as Box }];
  });
}

/** Asks the Hub what the Space is doing, e.g. RUNNING or SLEEPING. */
async function spaceStage(): Promise<string | null> {
  try {
    const res = await fetch(`https://huggingface.co/api/spaces/${SPACE_ID}/runtime`, {
      headers: HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { stage?: unknown };
    return typeof body.stage === "string" ? body.stage : null;
  } catch {
    return null;
  }
}

async function classify(err: unknown): Promise<Error> {
  const message = describe(err);
  const stage = await spaceStage();
  if (stage && STARTING_STAGES.has(stage)) return new OcrWakingError(`Space is ${stage}`);
  return new OcrUpstreamError(message);
}

function describe(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String(err.message);
  return String(err);
}
