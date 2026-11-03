import { getDb } from "@/lib/db";
import { getBootstrap } from "@/lib/queries";
import { seedDatabase } from "@/scripts/seed";

export async function POST() {
  try {
    await seedDatabase(getDb());
    const data = await getBootstrap();
    return Response.json(data);
  } catch (error) {
    console.error("[reset]", error);
    return Response.json({ error: "Unable to reset demo data." }, { status: 500 });
  }
}
