import { clearBootstrapCache, writeBootstrapCache } from "@/lib/cache";
import { getDb } from "@/lib/db";
import { demoControlsDisabledResponse, demoControlsEnabled } from "@/lib/demo-controls";
import { getBootstrap } from "@/lib/queries";
import type { BootstrapData } from "@/lib/types";
import { seedDatabase } from "@/scripts/seed";

export async function POST() {
  if (!demoControlsEnabled) return demoControlsDisabledResponse();
  try {
    await seedDatabase(getDb());
    await clearBootstrapCache();
    const data = await getBootstrap();
    const snapshot: BootstrapData = { ...data, updatedAt: new Date().toISOString() };
    await writeBootstrapCache(snapshot);
    return Response.json(snapshot);
  } catch (error) {
    console.error("[reset]", error);
    return Response.json({ error: "Unable to reset demo data." }, { status: 500 });
  }
}
