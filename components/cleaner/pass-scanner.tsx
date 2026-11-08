"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Check, Keyboard } from "lucide-react";
import { BarcodeViewfinder, ScanTips } from "@/components/scanner/barcode-viewfinder";
import { warmOcr } from "@/lib/client/scale-ocr";
import { useDemoMode, useStation } from "@/lib/client/station";
import { useBootstrap } from "@/lib/client/use-bootstrap";
import { lookupBarcode, useBarcodeScanner } from "@/lib/client/use-barcode-scanner";
import type { BarcodeMatch, Cleaner } from "@/lib/types";
import { CleanerShell, Panel } from "./cleaner-shell";

/** Demo pass barcodes: each encodes the cleaner's pass number as Code 128 (see public/passes/). */
export function passBarcodeSrc(c: Pick<Cleaner, "pass">): string {
  return `/passes/${c.pass}.svg`;
}

export function PassScanner() {
  const router = useRouter();
  const demo = useDemoMode();
  const station = useStation();
  const { data } = useBootstrap();
  const stationBin = data.bins.find((b) => b.id === station);
  const [verified, setVerified] = useState<BarcodeMatch["cleaner"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [typedPass, setTypedPass] = useState("");
  const [checking, setChecking] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  async function checkPass(code: string): Promise<boolean> {
    setMessage(null);
    try {
      const match = await lookupBarcode(code);
      if (!match) {
        setMessage("That isn't a registered staff pass. Try another pass, or type the number.");
        return false;
      }
      const cleaner = match.cleaner;
      setVerified(cleaner);
      timer.current = window.setTimeout(
        () => router.push(`/cleaner/building?cleaner=${cleaner.id}`),
        1400,
      );
      return true;
    } catch {
      setMessage("Couldn't check the pass. Check the internet connection and try again.");
      return false;
    }
  }

  const scanner = useBarcodeScanner((read) => checkPass(read.value));
  const startScanner = useRef(scanner.start);
  useEffect(() => {
    startScanner.current = scanner.start;
  });

  useEffect(() => {
    // The weigh step reads the scale with OCR on Hugging Face. Start waking it now.
    warmOcr();
    // A station laptop has already allowed the camera, so start scanning without a click.
    let cancelled = false;
    navigator.permissions
      ?.query({ name: "camera" as PermissionName })
      .then((p) => {
        if (!cancelled && p.state === "granted") void startScanner.current();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      window.clearTimeout(timer.current);
    };
  }, []);

  async function submitTypedPass(event: FormEvent) {
    event.preventDefault();
    if (!typedPass.trim() || checking) return;
    setChecking(true);
    const ok = await checkPass(typedPass);
    if (ok) scanner.stop();
    setChecking(false);
  }

  const error = scanner.error;
  const status = verified
    ? null
    : scanner.status === "scanning"
      ? "Looking for a barcode…"
      : scanner.status === "starting"
        ? "Starting the camera…"
        : null;

  return (
    <CleanerShell step={1} where={stationBin ? `${stationBin.short} central bin` : undefined}>
      <div className="grid flex-1 items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)] lg:gap-10">
        <Panel className="overflow-hidden">
          <BarcodeViewfinder
            videoRef={scanner.videoRef}
            status={verified ? "idle" : scanner.status}
            mirrored={scanner.mirrored}
            showScanLine={!error}
          >
            {verified ? (
              <div
                role="status"
                className="fade-up flex aspect-video w-full flex-col items-center justify-center gap-3 bg-smu-navy text-center text-white"
              >
                <span className="grid h-20 w-20 place-items-center rounded-full bg-smu-success text-white">
                  <Check className="h-10 w-10" strokeWidth={3} />
                </span>
                <p className="font-display text-[44px] leading-[52px]">
                  Hi, {verified.name.split(" ")[0]}
                </p>
                <p className="text-[16px] text-white/75">Opening your pantry list…</p>
              </div>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 p-8 text-center text-white">
                <Camera className="h-12 w-12 text-white/40" />
                {error ? (
                  <p className="max-w-md text-[16px] leading-6 text-white/85">{error}</p>
                ) : (
                  <p className="max-w-md text-[16px] leading-6 text-white/75">
                    The camera reads the barcode on your staff pass.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMessage(null);
                    void scanner.start();
                  }}
                  className="btn-smu btn-smu-gold h-12 px-6 text-[17px]"
                >
                  <Camera className="h-5 w-5" /> {error ? "Try the camera again" : "Start camera"}
                </button>
              </div>
            )}
          </BarcodeViewfinder>
        </Panel>

        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-display text-[36px] leading-[44px] text-smu-navy lg:text-[42px] lg:leading-[50px]">
              Hold your staff pass up to the camera
            </h1>
            <p className="mt-3 text-[17px] leading-7 text-black/75">
              Barcode facing the screen, inside the gold box. Your pass signs you in, so each
              drop-off shows who made it.
            </p>
          </div>

          <div aria-live="polite" className="flex flex-col gap-3 empty:hidden">
            {status && (
              <p className="flex items-center gap-2.5 text-[16px] font-semibold text-smu-navy">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-smu-gold" />
                {status}
              </p>
            )}
            {message && (
              <p className="rounded border border-smu-danger/25 bg-smu-danger/5 px-4 py-3 text-[16px] leading-6 text-[#a52a25]">
                {message}
              </p>
            )}
            {scanner.status === "scanning" && scanner.showTips && !error && (
              <div className="text-[15px] leading-6 text-black/75">
                <p className="font-semibold text-smu-navy">Not reading yet?</p>
                <ScanTips />
              </div>
            )}
          </div>

          {!verified && (
            <div className="border-t border-black/10 pt-5">
              {typing ? (
                <form onSubmit={submitTypedPass}>
                  <label htmlFor="typed-pass" className="block text-[15px] font-semibold text-smu-navy">
                    Pass number
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="typed-pass"
                      autoFocus
                      value={typedPass}
                      onChange={(event) => setTypedPass(event.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="SMU-CLN-0142"
                      className="h-12 min-w-0 flex-1 rounded border border-black/20 bg-white px-4 font-mono text-[18px] uppercase tracking-wide placeholder:normal-case placeholder:text-black/40 focus:border-smu-gold focus:outline-none focus:ring-2 focus:ring-smu-gold/30"
                    />
                    <button
                      type="submit"
                      disabled={!typedPass.trim() || checking}
                      className="btn-smu btn-smu-gold h-12 px-5 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {checking ? "Checking…" : "Sign in"}
                    </button>
                  </div>
                  <p className="mt-2 text-[14px] text-smu-muted">It&apos;s printed under the barcode.</p>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setTyping(true)}
                  className="cleaner-link"
                >
                  <Keyboard className="h-5 w-5" /> Type your pass number instead
                </button>
              )}
            </div>
          )}

          {demo && (
            <p className="rounded border border-dashed border-black/20 px-4 py-3 text-[15px] leading-6 text-black/70">
              Demo: no pass to hand? Show a{" "}
              <Link href="/passes" target="_blank" className="text-link">
                demo pass
              </Link>{" "}
              on a phone and hold it up to the camera.
            </p>
          )}
        </div>
      </div>
    </CleanerShell>
  );
}

export function PassCard({ cleaner, className = "" }: { cleaner: Cleaner; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-md bg-white text-black shadow-2xl ${className}`}>
      <div className="flex items-center justify-between bg-smu-navy px-3 py-1.5 text-[10px] font-semibold tracking-[0.15em] text-smu-gold-light">
        <span>SMU · STAFF PASS</span>
        <span className="text-white/70">{cleaner.shift} SHIFT</span>
      </div>
      <div className="p-3">
        <p className="truncate text-[14px] font-semibold text-smu-navy">{cleaner.name}</p>
        <p className="text-[11.5px] text-smu-muted">{cleaner.vendor}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={passBarcodeSrc(cleaner)}
          alt={`Barcode for ${cleaner.pass}`}
          className="mt-3 block h-auto w-full"
        />
        <p className="mt-1 text-center font-mono text-[11.5px] tabular-nums text-black/70">
          {cleaner.pass}
        </p>
      </div>
    </div>
  );
}
