import { simulateStep } from "@/lib/queries";

export async function POST() {
  try {
    const event = await simulateStep();
    return Response.json({ event });
  } catch (error) {
    console.error("[simulate]", error);
    return Response.json({ error: "Unable to simulate a drop-off." }, { status: 500 });
  }
}
