import { clearBootstrapCache } from "@/lib/cache";
import { collectBin } from "@/lib/queries";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { binId?: string; cleanerId?: string | null };
    if (!body.binId) return Response.json({ error: "binId is required." }, { status: 400 });
    const event = await collectBin(body.binId, body.cleanerId);
    if (!event) return Response.json({ error: "Bin is already empty." }, { status: 409 });
    await clearBootstrapCache();
    return Response.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to collect bin.";
    console.error("[collect]", error);
    return Response.json({ error: message }, { status: 400 });
  }
}
