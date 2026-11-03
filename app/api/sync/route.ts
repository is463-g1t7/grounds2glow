import { syncRandomReading } from "@/lib/queries";

export async function POST() {
  try {
    const event = await syncRandomReading();
    if (!event) return Response.json({ error: "No bin has room for a new reading." }, { status: 409 });
    return Response.json({ event }, { status: 201 });
  } catch (error) {
    console.error("[sync]", error);
    return Response.json({ error: "Unable to sync a reading." }, { status: 500 });
  }
}
