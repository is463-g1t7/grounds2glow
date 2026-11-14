import { captureUnavailable, createPairing, pairStatus, sessionFrom, unpair } from "@/lib/capture";

/**
 * The laptop's pairing. POST makes a pairing code for the phone (keeping the laptop's session if
 * it sends one), GET says whether a phone has joined and is online, DELETE unpairs.
 */
export async function POST(request: Request) {
  const unavailable = captureUnavailable();
  if (unavailable) return Response.json({ error: unavailable }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { station?: unknown };
  const station = typeof body.station === "string" && body.station.length <= 64 ? body.station : null;
  try {
    return Response.json(await createPairing(sessionFrom(request), station));
  } catch (error) {
    console.error("[capture/pair]", error);
    return Response.json({ error: "Couldn't start pairing. Try again." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const unavailable = captureUnavailable();
  if (unavailable) return Response.json({ error: unavailable }, { status: 503 });

  const sid = sessionFrom(request);
  const status = sid ? await pairStatus(sid) : null;
  if (!status) return Response.json({ error: "Not paired." }, { status: 404 });
  return Response.json(status);
}

export async function DELETE(request: Request) {
  const sid = sessionFrom(request);
  if (sid) await unpair(sid);
  return Response.json({ ok: true });
}
