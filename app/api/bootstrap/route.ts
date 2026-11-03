import { getBootstrap } from "@/lib/queries";

export async function GET() {
  try {
    const data = await getBootstrap();
    return Response.json(data);
  } catch (error) {
    console.error("[bootstrap]", error);
    return Response.json({ error: "Unable to load dashboard data." }, { status: 500 });
  }
}
