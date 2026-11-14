import { captureUnavailable, claimJob, phoneCheck, sessionFrom, updateJob, type PhoneUpdate } from "@/lib/capture";
import type { CaptureResult } from "@/lib/capture-types";
import type { OcrLine } from "@/lib/languages";

/** A preview is a downsized JPEG, well under this. */
const MAX_PREVIEW_CHARS = 900_000;
const MAX_LINES = 200;

/**
 * The phone's side of a capture. GET checks for a waiting capture (`?beat=1` also marks the phone
 * online). POST `{ action, id }` claims one, then reports the photo (`captured`), the OCR result
 * (`result`) or a failure (`failed`).
 */
export async function GET(request: Request) {
  const unavailable = captureUnavailable();
  if (unavailable) return Response.json({ error: unavailable }, { status: 503 });
  const sid = sessionFrom(request);
  if (!sid) return Response.json({ error: "Not paired." }, { status: 401 });

  const beat = new URL(request.url).searchParams.get("beat") === "1";
  const { paired, job } = await phoneCheck(sid, beat);
  if (!paired) return Response.json({ error: "Not paired." }, { status: 404 });
  return Response.json({ job });
}

export async function POST(request: Request) {
  const unavailable = captureUnavailable();
  if (unavailable) return Response.json({ error: unavailable }, { status: 503 });
  const sid = sessionFrom(request);
  if (!sid) return Response.json({ error: "Not paired." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    action?: unknown;
    id?: unknown;
    preview?: unknown;
    result?: unknown;
    error?: unknown;
  };
  if (typeof body.id !== "string") return Response.json({ error: "id is required." }, { status: 400 });

  if (body.action === "claim") {
    const job = await claimJob(sid, body.id);
    if (!job) return Response.json({ error: "This capture was taken or cancelled." }, { status: 409 });
    return Response.json({ job });
  }

  let update: PhoneUpdate;
  if (body.action === "captured") {
    const preview = body.preview;
    if (
      typeof preview !== "string" ||
      !preview.startsWith("data:image/jpeg;base64,") ||
      preview.length > MAX_PREVIEW_CHARS
    ) {
      return Response.json({ error: "preview must be a JPEG data URL under 900 kB." }, { status: 400 });
    }
    update = { type: "captured", preview };
  } else if (body.action === "result") {
    const result = parseResult(body.result);
    if (!result) return Response.json({ error: "result is malformed." }, { status: 400 });
    update = { type: "result", result };
  } else if (body.action === "failed") {
    const error = typeof body.error === "string" && body.error ? body.error.slice(0, 300) : "The phone couldn't read the scale.";
    update = { type: "failed", error };
  } else {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }

  if (!(await updateJob(sid, body.id, update))) {
    return Response.json({ error: "The laptop has moved on from this capture." }, { status: 409 });
  }
  return Response.json({ ok: true });
}

function parseResult(raw: unknown): CaptureResult | null {
  if (!raw || typeof raw !== "object") return null;
  const { lines, reading, ms } = raw as { lines?: unknown; reading?: unknown; ms?: unknown };
  if (!Array.isArray(lines) || lines.length > MAX_LINES || typeof ms !== "number") return null;
  const cleanLines: OcrLine[] = [];
  for (const line of lines) {
    const { text, box } = (line ?? {}) as { text?: unknown; box?: unknown };
    if (typeof text !== "string" || !Array.isArray(box)) return null;
    cleanLines.push({
      text: text.slice(0, 200),
      box: box.slice(0, 8).map((p) => [Number(p?.[0]) || 0, Number(p?.[1]) || 0]),
    });
  }
  let cleanReading: CaptureResult["reading"] = null;
  if (reading != null) {
    const r = reading as Record<string, unknown>;
    if (
      typeof r.value !== "number" ||
      typeof r.kg !== "number" ||
      (r.unit !== "kg" && r.unit !== "g") ||
      (r.unitFrom !== "photo" && r.unitFrom !== "station" && r.unitFrom !== "guess")
    ) {
      return null;
    }
    cleanReading = { value: r.value, kg: r.kg, unit: r.unit, unitFrom: r.unitFrom };
  }
  return { lines: cleanLines, reading: cleanReading, ms };
}
