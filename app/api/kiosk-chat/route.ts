import {
  cacheConfigured,
  readKioskAnswerCache,
  writeKioskAnswerCache,
} from "@/lib/cache";
import { askOpenRouter } from "@/lib/openrouter";

const SYSTEM_PROMPT = `You are the Grounds to Glow assistant at Singapore Management University (SMU).
You answer questions about the Grounds to Glow kiosk, used coffee grounds, the skincare quiz, scrub recipes, safe use and storage.

Style:
- Be warm, concise and practical: at most 120 words.
- Prefer short paragraphs or a few bullet points.
- Never give medical advice. For irritation or allergic reactions, tell the person to rinse immediately, stop using the scrub, and seek medical help if symptoms persist.
- If a question is outside the Grounds to Glow materials, say that the information is not available in the materials you were given, then offer the topics you can help with.

Facts you may rely on:
- Grounds to Glow is an initiative by SMU's Office of Campus Infrastructure & Services (OCIS).
- It gives used coffee grounds a second life as a DIY body scrub, reducing campus waste and promoting circularity.
- Using the kiosk and dispensing a scrub is free of charge.
- Used grounds are collected from staff pantries in smart collection bins, transported by volunteers, dried in a solar dehydrator, then prepared for scrub use under hygiene and safety checks.
- The kiosk's smart dispenser measures the main ingredients.
- Standard recipe: 5 g dried coffee grounds, 6 g sugar and 7.5 ml oil.
- Gentle recipe: 3 g coffee grounds, 6 g sugar and 7.5 ml oil.
- Moisturising recipe: 5 g coffee grounds, 6 g sugar and 10 ml oil.
- Optional: 1-2 drops of essential oil, then mix with the provided spoon.
- Use the scrub immediately. Do not store or reuse leftovers.
- Do not use the scrub on the face, around the eyes, or on sensitive, broken, sunburnt or irritated skin. Check for ingredient allergies first.`;

// ponytail: per-instance limiter; use Redis if this endpoint runs on many instances
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (buckets.size > 1_000) {
    for (const [key, bucket] of buckets) if (bucket.resetAt < now) buckets.delete(key);
  }
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (bucket.count >= 30) return true;
  bucket.count += 1;
  return false;
}

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "local";
    if (rateLimited(ip)) {
      return Response.json({ error: "Too many messages. Try again in a minute." }, { status: 429 });
    }

    const body = (await request.json()) as { prompt?: string };
    const prompt = body.prompt?.trim();
    if (!prompt || prompt.length > 2_000) {
      return Response.json(
        { error: "A prompt of up to 2000 characters is required." },
        { status: 400 }
      );
    }

    const cached = await readKioskAnswerCache(prompt);
    if (cached) {
      return Response.json({ content: cached }, { headers: { "x-answer-cache": "HIT" } });
    }

    const content = await askOpenRouter(SYSTEM_PROMPT, prompt);
    await writeKioskAnswerCache(prompt, content);
    return Response.json(
      { content },
      { headers: { "x-answer-cache": cacheConfigured ? "MISS" : "BYPASS" } },
    );
  } catch (error) {
    console.error("[kiosk-chat]", error);
    return Response.json({ error: "Chat is unavailable right now." }, { status: 503 });
  }
}
