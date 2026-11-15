import { clearBootstrapCache } from "@/lib/cache";
import { createDispense } from "@/lib/queries";
import { isScrubRecipe } from "@/lib/scrubs";

/** The Grounds to Glow kiosk calls this each time it dispenses a coffee scrub. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { recipe?: unknown };
    if (!isScrubRecipe(body.recipe)) {
      return Response.json({ error: "Unknown recipe." }, { status: 400 });
    }
    const dispense = await createDispense(body.recipe);
    await clearBootstrapCache();
    return Response.json({ dispense }, { status: 201 });
  } catch (error) {
    console.error("[dispense]", error);
    return Response.json({ error: "Unable to record the dispense." }, { status: 500 });
  }
}
