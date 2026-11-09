import { clearBootstrapCache } from "@/lib/cache";
import { demoControlsDisabledResponse, demoControlsEnabled } from "@/lib/demo-controls";
import { syncRandomReading } from "@/lib/queries";

export async function POST() {
  if (!demoControlsEnabled) return demoControlsDisabledResponse();
  try {
    const event = await syncRandomReading();
    if (!event) return Response.json({ error: "No bin has room for a new reading." }, { status: 409 });
    await clearBootstrapCache();
    return Response.json({ event }, { status: 201 });
  } catch (error) {
    console.error("[sync]", error);
    return Response.json({ error: "Unable to sync a reading." }, { status: 500 });
  }
}
