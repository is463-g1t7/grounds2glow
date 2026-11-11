"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Smartphone, Unlink } from "lucide-react";
import {
  getPairStatus,
  setCaptureSession,
  startPairing,
  unpairSession,
  useCaptureSession,
} from "@/lib/client/capture";
import { useStation } from "@/lib/client/station";
import type { PairStatus } from "@/lib/capture-types";
import { CleanerShell, Panel } from "./cleaner-shell";

/** How often the laptop checks whether the phone has joined, while a code is showing. */
const JOIN_POLL_MS = 2_000;
/** How often it refreshes the phone's online status otherwise. */
const STATUS_POLL_MS = 5_000;

type Code = { code: string; expiresAt: number; qr: string; url: string; pairedBefore: string | null };

/**
 * Laptop setup: pairs this laptop with the phone that photographs the scale. The laptop shows a
 * six-digit code (and a QR code that opens the phone page with it filled in); the phone enters it.
 */
export function PhonePairing() {
  const sid = useCaptureSession("laptop");
  const station = useStation();
  const [status, setStatus] = useState<PairStatus | null>(null);
  const [code, setCode] = useState<Code | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only read once a code is showing; set to the real time then.
  const [now, setNow] = useState(0);

  // Keep the phone's status current. While a code shows, check often so pairing feels instant.
  useEffect(() => {
    if (!sid) return;
    let cancelled = false;
    async function check() {
      try {
        const next = await getPairStatus(sid as string);
        if (cancelled) return;
        if (!next) {
          setCaptureSession("laptop", null);
          setStatus(null);
          return;
        }
        setStatus(next);
        if (next.pairedAt && next.pairedAt !== code?.pairedBefore) setCode(null);
      } catch {
        // Offline for a moment: keep what's showing and check again.
      }
    }
    void check();
    const timer = window.setInterval(() => void check(), code ? JOIN_POLL_MS : STATUS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [sid, code]);

  // Count the code's lifetime down.
  useEffect(() => {
    if (!code) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [code]);

  async function showCode() {
    setBusy(true);
    setError(null);
    try {
      const pairing = await startPairing(sid ?? null, station);
      setCaptureSession("laptop", pairing.session);
      const url = `${window.location.origin}/cleaner/camera?code=${pairing.code}`;
      const { default: QRCode } = await import("qrcode");
      const qr = await QRCode.toDataURL(url, {
        color: { dark: "#141B4D", light: "#ffffff" },
        errorCorrectionLevel: "M",
        margin: 2,
        width: 480,
      }).catch(() => "");
      setNow(Date.now());
      setCode({
        code: pairing.code,
        expiresAt: Date.now() + pairing.expiresInSeconds * 1000,
        qr,
        url,
        pairedBefore: status?.pairedAt ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start pairing. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function unpair() {
    if (!sid) return;
    setBusy(true);
    try {
      await unpairSession(sid);
    } catch {
      // Forget it here anyway. The server copy expires on its own.
    }
    setCaptureSession("laptop", null);
    setStatus(null);
    setCode(null);
    setBusy(false);
  }

  const paired = status?.paired ?? false;
  const secondsLeft = code ? Math.max(0, Math.ceil((code.expiresAt - now) / 1000)) : 0;
  const expired = code != null && secondsLeft === 0;

  return (
    <CleanerShell where="Phone camera setup">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)] lg:gap-8">
        <Panel className="flex flex-col gap-5 p-6">
          <h1 className="font-display text-[36px] leading-[44px] text-smu-navy">Phone camera</h1>
          <p className="cleaner-body">
            A phone on a stand at the bin photographs the scale. When a cleaner picks a pantry level
            on this laptop, the phone takes the photo, reads the weight and sends it here.
          </p>

          <PairState paired={paired} online={status?.phoneOnline ?? false} known={sid === null || status != null} />

          {error && (
            <p className="text-[16px] font-semibold text-[#a52a25]" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void showCode()}
              disabled={busy}
              className={`btn-smu cleaner-action ${paired ? "btn-smu-outline" : "btn-smu-gold"}`}
            >
              <Smartphone className="h-5 w-5" />{" "}
              {code && !expired ? "Show a new code" : paired ? "Pair another phone" : "Pair a phone"}
            </button>
            {paired && (
              <button
                type="button"
                onClick={() => void unpair()}
                disabled={busy}
                className="btn-smu btn-smu-outline cleaner-action"
              >
                <Unlink className="h-5 w-5" /> Unpair the phone
              </button>
            )}
          </div>
          <Link href="/cleaner" className="cleaner-link">
            Back to drop-offs
          </Link>
        </Panel>

        {code && (
          <Panel className="flex flex-col items-center gap-4 p-6 text-center">
            {expired ? (
              <>
                <h2 className="font-display text-[28px] leading-9 text-smu-navy">The code expired</h2>
                <p className="cleaner-body">Show a new code to pair the phone.</p>
              </>
            ) : (
              <>
                <h2 className="font-display text-[28px] leading-9 text-smu-navy">On the phone</h2>
                <p className="cleaner-body">
                  Scan this QR code, or open{" "}
                  <span className="font-semibold text-black">{code.url.replace(/\?.*$/, "")}</span> and
                  enter the code.
                </p>
                {code.qr && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={code.qr} alt="QR code that opens the phone camera page" className="h-56 w-56" />
                )}
                <p
                  className="font-display text-[56px] leading-[60px] tracking-[0.18em] tabular-nums text-smu-navy"
                  aria-label={`Pairing code ${code.code.split("").join(" ")}`}
                >
                  {code.code.slice(0, 3)}&thinsp;{code.code.slice(3)}
                </p>
                <p className="text-[15px] text-black/65" role="status">
                  Works for {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}{" "}
                  more · waiting for the phone…
                </p>
              </>
            )}
          </Panel>
        )}
      </div>
    </CleanerShell>
  );
}

function PairState({ paired, online, known }: { paired: boolean; online: boolean; known: boolean }) {
  if (!known) {
    return (
      <p className="text-[16px] text-smu-muted" role="status">
        Checking the phone…
      </p>
    );
  }
  if (!paired) {
    return (
      <p className="rounded border border-black/10 bg-smu-cream-light px-4 py-3 text-[16px] text-black/80">
        No phone is paired with this laptop.
      </p>
    );
  }
  return (
    <p
      className="flex items-center gap-3 rounded border border-black/10 bg-smu-cream-light px-4 py-3 text-[16px] text-black/85"
      role="status"
    >
      <CheckCircle2 className="h-6 w-6 shrink-0 text-smu-success" />
      <span>
        <span className="font-semibold">Phone paired.</span>{" "}
        {online ? "It's on and ready." : "It isn't connected right now. Open the camera page on the phone."}
      </span>
    </p>
  );
}
