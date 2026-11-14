import { captureUnavailable, joinWithCode } from "@/lib/capture";

/** The phone enters the laptop's pairing code and gets the shared capture session. */
export async function POST(request: Request) {
  const unavailable = captureUnavailable();
  if (unavailable) return Response.json({ error: unavailable }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.replace(/\s/g, "") : "";
  const result = await joinWithCode(code, request);
  if (!result.ok) {
    return result.reason === "locked"
      ? Response.json({ error: "Too many wrong codes. Wait 10 minutes, then try again." }, { status: 429 })
      : Response.json(
          { error: "That code didn't work. Check the code on the laptop. Codes last 10 minutes." },
          { status: 400 },
        );
  }
  return Response.json({ session: result.session, station: result.station });
}
