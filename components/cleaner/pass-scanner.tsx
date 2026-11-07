"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Check } from "lucide-react";
import {
  BarcodeViewfinder,
  CameraOffPlaceholder,
  ScanTips,
} from "@/components/scanner/barcode-viewfinder";
import { warmOcr } from "@/lib/client/scale-ocr";
import { lookupBarcode, useBarcodeScanner } from "@/lib/client/use-barcode-scanner";
import type { BarcodeMatch, Cleaner } from "@/lib/types";
import { CleanerShell, StepColumns } from "./cleaner-shell";

/** Demo pass barcodes: each encodes the cleaner's pass number as Code 128 (see public/passes/). */
export function passBarcodeSrc(c: Pick<Cleaner, "pass">): string {
  return `/passes/${c.pass}.svg`;
}

export function PassScanner() {
  const router = useRouter();
  const [verified, setVerified] = useState<BarcodeMatch["cleaner"] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [typedPass, setTypedPass] = useState("");
  const [checking, setChecking] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    // The weigh step reads the scale with OCR on Hugging Face. Start waking it now.
    warmOcr();
    return () => window.clearTimeout(timer.current);
  }, []);

  async function checkPass(code: string): Promise<boolean> {
    setMessage(null);
    try {
      const match = await lookupBarcode(code);
      if (!match) {
        setMessage("This isn't a registered staff pass. Try a different pass.");
        return false;
      }
      const cleaner = match.cleaner;
      setVerified(cleaner);
      timer.current = window.setTimeout(
        () => router.push(`/cleaner/building?cleaner=${cleaner.id}`),
        1200,
      );
      return true;
    } catch {
      setMessage("Couldn't check this pass. Check your connection and try again.");
      return false;
    }
  }

  const scanner = useBarcodeScanner((read) => checkPass(read.value));
  const error = scanner.error;

  async function submitTypedPass(event: FormEvent) {
    event.preventDefault();
    if (!typedPass.trim() || checking) return;
    scanner.stop();
    setChecking(true);
    await checkPass(typedPass);
    setChecking(false);
  }

  return (
    <CleanerShell step={1}>
      <StepColumns
        narrowMain
        main={
          <section className="overflow-hidden rounded-md border border-black/10 bg-white shadow-card">
            <BarcodeViewfinder
              videoRef={scanner.videoRef}
              status={scanner.status}
              mirrored={scanner.mirrored}
              showScanLine={!error}
            >
              {verified ? (
                <div
                  role="status"
                  className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-smu-navy/90 text-center text-white"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-smu-success">
                    <Check className="h-7 w-7" />
                  </span>
                  <p className="font-display text-[22px] leading-7">Pass verified</p>
                  <p className="text-[13px] text-white/80">
                    {verified.name} · {verified.pass}
                  </p>
                  <p className="text-[11px] text-white/50">Opening pantry picker…</p>
                </div>
              ) : (
                <CameraOffPlaceholder />
              )}
            </BarcodeViewfinder>

            <div aria-live="polite" className="flex flex-col gap-2 p-3 empty:hidden">
              {scanner.status === "idle" && !verified && (
                <button
                  type="button"
                  onClick={() => {
                    setMessage(null);
                    void scanner.start();
                  }}
                  className="btn-smu btn-smu-gold"
                >
                  <Camera className="h-4 w-4" /> Open camera
                </button>
              )}
              {scanner.status === "starting" && (
                <button type="button" disabled className="btn-smu btn-smu-gold opacity-50">
                  Starting camera…
                </button>
              )}
              {scanner.status === "scanning" && (
                <>
                  <p className="text-[13px] text-smu-muted">
                    Scanning… Hold the barcode inside the box.
                  </p>
                  <button type="button" onClick={scanner.stop} className="btn-smu btn-smu-outline">
                    Stop camera
                  </button>
                </>
              )}
              {(error ?? message) && (
                <p className="rounded border border-smu-danger/20 bg-smu-danger/5 px-3 py-2 text-[13px] text-smu-danger">
                  {error ?? message}
                </p>
              )}
              {scanner.status === "scanning" && scanner.showTips && !error && (
                <div className="text-[13px] leading-6 text-smu-muted">
                  <p className="font-semibold text-smu-navy">No read yet.</p>
                  <ScanTips />
                </div>
              )}
            </div>

            {!verified && (
              <form onSubmit={submitTypedPass} className="border-t border-black/10 p-3">
                <label
                  htmlFor="typed-pass"
                  className="block text-[11px] font-semibold uppercase tracking-[1px] text-smu-muted"
                >
                  Or type your pass number
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="typed-pass"
                    value={typedPass}
                    onChange={(event) => setTypedPass(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="SMU-CLN-0142"
                    className="h-10 min-w-0 flex-1 rounded border border-black/15 bg-white px-3 font-mono text-[14px] uppercase placeholder:normal-case placeholder:text-black/30 focus:border-smu-gold focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!typedPass.trim() || checking}
                    className="btn-smu btn-smu-outline disabled:opacity-40"
                  >
                    {checking ? "Checking…" : "Continue"}
                  </button>
                </div>
              </form>
            )}
          </section>
        }
        side={
          <section className="flex flex-col gap-2 lg:gap-3">
            <div className="hidden lg:block">
              <h1 className="font-display text-[32px] leading-10 text-smu-navy">
                Scan your staff pass
              </h1>
              <p className="mt-1 text-[14px] leading-6 text-smu-muted">
                Your pass signs every drop-off, so the bin&apos;s audit trail shows who emptied
                which pantry and when.
              </p>
            </div>
            <div className="rounded-md border border-black/10 bg-white p-4 shadow-card">
              <h2 className="font-display text-[20px] leading-7 text-smu-navy">
                Don&apos;t have a pass with you?
              </h2>
              <p className="mt-1 text-[13px] leading-6 text-smu-muted">
                Open the demo passes on another screen or print them, then scan one here. On a
                single device, type a pass number instead.
              </p>
              <Link href="/passes" className="text-link mt-2 text-[13px]">
                Open demo passes
              </Link>
            </div>
          </section>
        }
      />
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
