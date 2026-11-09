import { readBootstrapCache, writeBootstrapCache } from "@/lib/cache";
import { getBootstrap } from "@/lib/queries";
import type { BootstrapData } from "@/lib/types";

export async function GET(request: Request) {
  const bypassCache = new URL(request.url).searchParams.get("refresh") === "1";
  const headers = { "cache-control": "no-store" };

  try {
    if (!bypassCache) {
      const cached = await readBootstrapCache<BootstrapData>();
      if (cached) {
        return Response.json(cached, { headers: { ...headers, "x-cache": "HIT" } });
      }
    }

    const data = await getBootstrap();
    const snapshot: BootstrapData = { ...data, updatedAt: new Date().toISOString() };
    await writeBootstrapCache(snapshot);

    return Response.json(snapshot, {
      headers: { ...headers, "x-cache": bypassCache ? "BYPASS" : "MISS" },
    });
  } catch (error) {
    console.error("[bootstrap]", error);
    return Response.json({ error: "Unable to load dashboard data." }, { status: 500, headers });
  }
}
