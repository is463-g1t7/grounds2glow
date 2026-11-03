import { createReading } from "@/lib/queries";
import type { EventSource } from "@/lib/types";

const SOURCES: EventSource[] = ["ocr", "reference", "manual", "demo"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      binId?: string;
      level?: number;
      afterKg?: number;
      source?: EventSource;
      cleanerId?: string | null;
      photo?: string | null;
    };
    if (!body.binId || typeof body.level !== "number" || !Number.isInteger(body.level) || typeof body.afterKg !== "number") {
      return Response.json({ error: "binId, level and afterKg are required." }, { status: 400 });
    }
    if (!body.source || !SOURCES.includes(body.source)) {
      return Response.json({ error: "Unknown reading source." }, { status: 400 });
    }
    const event = await createReading({
      binId: body.binId,
      level: body.level,
      afterKg: body.afterKg,
      source: body.source,
      cleanerId: body.cleanerId,
      photo: body.photo,
    });
    if (!event) {
      return Response.json({ error: "Reading is not above the bin's last total." }, { status: 409 });
    }
    return Response.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record reading.";
    console.error("[readings]", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
