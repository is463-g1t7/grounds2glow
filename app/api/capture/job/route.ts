import { cancelJob, captureUnavailable, createJob, getJob, sessionFrom } from "@/lib/capture";
import type { CaptureRequest } from "@/lib/capture-types";

/**
 * The laptop's side of a capture. POST asks the paired phone for a photo, GET polls its progress
 * (`?id=`), DELETE cancels it (`?id=`). The laptop saves the reading itself, via /api/readings.
 */
export async function POST(request: Request) {
  const unavailable = captureUnavailable();
  if (unavailable) return Response.json({ error: unavailable }, { status: 503 });
  const sid = sessionFrom(request);
  if (!sid) return Response.json({ error: "Not paired." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Partial<Record<keyof CaptureRequest, unknown>>;
  const { binId, binShort, level, unit, capacityKg } = body;
  if (
    typeof binId !== "string" ||
    typeof binShort !== "string" ||
    typeof level !== "number" ||
    !Number.isInteger(level) ||
    level < 1 ||
    (unit !== "kg" && unit !== "g") ||
    typeof capacityKg !== "number" ||
    !(capacityKg > 0)
  ) {
    return Response.json({ error: "binId, binShort, level, unit and capacityKg are required." }, { status: 400 });
  }

  const job = await createJob(sid, { binId, binShort, level, unit, capacityKg });
  if (!job) return Response.json({ error: "Not paired." }, { status: 404 });
  return Response.json({ job }, { status: 201 });
}

export async function GET(request: Request) {
  const sid = sessionFrom(request);
  const id = new URL(request.url).searchParams.get("id");
  if (!sid || !id) return Response.json({ error: "Session and id are required." }, { status: 400 });
  const job = await getJob(sid, id);
  if (!job) return Response.json({ error: "This capture has ended." }, { status: 404 });
  return Response.json({ job });
}

export async function DELETE(request: Request) {
  const sid = sessionFrom(request);
  const id = new URL(request.url).searchParams.get("id");
  if (sid && id) await cancelJob(sid, id);
  return Response.json({ ok: true });
}
