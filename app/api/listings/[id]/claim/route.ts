import { claimListing } from "@/lib/queries";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const listing = await claimListing(id);
    if (!listing) return Response.json({ error: "Batch is already reserved." }, { status: 409 });
    return Response.json({ listing });
  } catch (error) {
    console.error("[claim]", error);
    return Response.json({ error: "Unable to claim batch." }, { status: 500 });
  }
}
