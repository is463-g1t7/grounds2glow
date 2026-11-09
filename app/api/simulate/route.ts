import { clearBootstrapCache } from "@/lib/cache";
import { demoControlsDisabledResponse, demoControlsEnabled } from "@/lib/demo-controls";
import { simulateStep } from "@/lib/queries";

export async function POST() {
  if (!demoControlsEnabled) return demoControlsDisabledResponse();
  try {
    const event = await simulateStep();
    await clearBootstrapCache();
    return Response.json({ event });
  } catch (error) {
    console.error("[simulate]", error);
    return Response.json({ error: "Unable to simulate a drop-off." }, { status: 500 });
  }
}
