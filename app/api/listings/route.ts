import { createListing } from "@/lib/queries";
import type { Listing } from "@/lib/types";

const TYPES: Listing["type"][] = ["Espresso", "Filter", "Decaf"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<{
      title: string;
      type: Listing["type"];
      weightKg: number;
      building: string;
      donor: string;
      pickup: string;
      image: string;
      tags: string[];
      note: string;
    }>;
    if (
      !body.title ||
      !body.type ||
      !TYPES.includes(body.type) ||
      typeof body.weightKg !== "number" ||
      body.weightKg <= 0 ||
      !body.building ||
      !body.donor ||
      !body.pickup
    ) {
      return Response.json({ error: "title, type, weightKg, building, donor and pickup are required." }, { status: 400 });
    }
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
      : ["New", "Available now"];
    const listing = await createListing({
      title: body.title,
      type: body.type,
      weightKg: body.weightKg,
      building: body.building,
      donor: body.donor,
      pickup: body.pickup,
      image: body.image ?? "/images/coffee-machine.jpg",
      tags,
      note: body.note ?? "",
    });
    return Response.json({ listing }, { status: 201 });
  } catch (error) {
    console.error("[listings]", error);
    return Response.json({ error: "Unable to create listing." }, { status: 500 });
  }
}
