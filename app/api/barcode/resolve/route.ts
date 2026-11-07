import { resolveBarcode } from "@/lib/queries";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
    if (typeof body?.code !== "string" || body.code.length > 128) {
      return Response.json({ error: "A barcode value is required." }, { status: 400 });
    }
    return Response.json({ match: await resolveBarcode(body.code) });
  } catch (error) {
    // Barcode values can be real ID numbers, so only the error is logged.
    console.error("[barcode/resolve]", error);
    return Response.json({ error: "Unable to check this barcode." }, { status: 500 });
  }
}
