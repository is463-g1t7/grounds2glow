"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Camera, ScanLine, Upload } from "lucide-react";
import { PageHeader } from "@/components/smu/page-chrome";
import { Toast } from "@/components/smu/toast";
import { levelsFor, pantryLabel } from "@/lib/bins";
import { weight } from "@/lib/format";
import { pickFrame } from "@/lib/scales";
import { apiRequest, useBootstrap } from "@/lib/client/use-bootstrap";
import type { BinEvent } from "@/lib/types";
import { runDemoOcr } from "@/lib/demo-ocr";

type Phase = "idle" | "camera" | "sending" | "done";

export default function ScanPage() {
  const { data, refresh } = useBootstrap();
  const bins = data.bins;
  const [binId, setBinId] = useState("");
  const [level, setLevel] = useState(3);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ kg: number; at: string; pantry: string | null } | null>(
    null
  );
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const selectedId = (binId || bins[0]?.id) ?? "";
  const bin = bins.find((b) => b.id === selectedId) ?? bins[0];
  const levels = bin ? levelsFor(bin) : 3;
  const safeLevel = Math.min(Math.max(1, level), levels);

  function keepShot(url: string) {
    setShotUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("camera");
    } catch {
      setError("Camera unavailable — upload a photo of the scale LCD instead.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function readWeight() {
    if (!bin || busyRef.current) return;
    busyRef.current = true;
    setPhase("sending");
    setError(null);
    setResult(null);
    try {
      const frame = pickFrame(bin.weightKg);
      if (!frame) {
        throw new Error(`${bin.short} is too full for the available scale frames. Collect the bin first.`);
      }
      const kg = frame.refKg;
      await runDemoOcr({
        kind: "scale",
        size: { width: 1200, height: 800 },
        kg,
        delayMs: 900,
      });
      if (kg <= bin.weightKg) {
        throw new Error(
          `Scale reads ${weight(kg)}, not above the bin's ${weight(bin.weightKg)}. Collect the bin first or use a different frame.`
        );
      }
      const { event } = await apiRequest<{ event: BinEvent }>("/api/readings", {
        method: "POST",
        body: JSON.stringify({ binId: bin.id, level: safeLevel, afterKg: kg, source: "ocr" }),
      });
      await refresh();
      setResult({
        kg: event.afterKg ?? kg,
        at: event.at,
        pantry: event.pantry ?? pantryLabel(bin, safeLevel),
      });
      setToast(`${pantryLabel(bin, safeLevel)} logged at ${weight(kg)}.`);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the scale.");
      setPhase("camera");
    } finally {
      busyRef.current = false;
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("Camera not ready yet — wait a second and retry.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Capture failed — try again.");
          return;
        }
        keepShot(URL.createObjectURL(blob));
        stopCamera();
        void readWeight();
      },
      "image/jpeg",
      0.9
    );
  }

  function onFile(file: File | undefined) {
    if (!file || busyRef.current) return;
    keepShot(URL.createObjectURL(file));
    void readWeight();
  }

  return (
    <>
      <PageHeader
        title="Scale scanner"
        lead="Point the overhead phone at the scale LCD, scan, and the weight posts straight to the dashboard."
        crumbs={[{ label: "Home", href: "/" }, { label: "Tools" }, { label: "Scale scanner" }]}
        actions={
          <>
            <Link href="/ocr" className="btn-smu btn-smu-outline">
              <ScanLine className="h-4 w-4" /> OCR reader
            </Link>
            <Link href="/dashboard" className="btn-smu btn-smu-outline">
              Open dashboard <ArrowUpRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      <section className="bg-smu-cream pb-20 pt-8">
        <div className="container-smu">
          <div className="flex max-w-xl flex-wrap gap-3">
            <label className="flex min-w-56 flex-1 flex-col gap-1 text-[13px]">
              <span className="text-[11px] font-semibold uppercase tracking-[1px] text-smu-muted">
                Bin under the scale
              </span>
              <select
                value={bin?.id ?? ""}
                onChange={(e) => setBinId(e.target.value)}
                className="h-10 rounded border border-black/15 bg-white px-3 text-[14px] focus:border-smu-gold focus:outline-none"
              >
                {bins.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.short}) · {weight(b.weightKg)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex w-32 flex-col gap-1 text-[13px]">
              <span className="text-[11px] font-semibold uppercase tracking-[1px] text-smu-muted">
                Pantry level
              </span>
              <select
                value={safeLevel}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="h-10 rounded border border-black/15 bg-white px-3 text-[14px] focus:border-smu-gold focus:outline-none"
              >
                {Array.from({ length: levels }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    L{i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <section className="overflow-hidden rounded-md border border-black/10 bg-white shadow-card">
              <div className="relative bg-smu-navy-deep">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`block aspect-[4/3] w-full object-cover ${
                    phase === "camera" || phase === "sending" ? "" : "hidden"
                  }`}
                />
                {phase !== "camera" && phase !== "sending" && (
                  <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 p-6 text-center">
                    {shotUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shotUrl} alt="Captured scale LCD" className="max-h-64 w-auto object-contain" />
                    ) : (
                      <>
                        <ScanLine className="h-10 w-10 text-white/30" />
                        <p className="text-[13px] text-white/60">
                          Phone&apos;s view — LCD faces up, 0.05 kg resolution
                        </p>
                      </>
                    )}
                    <div className="flex flex-wrap justify-center gap-2">
                      <button type="button" onClick={startCamera} className="btn-smu btn-smu-gold btn-smu-sm">
                        <Camera className="h-4 w-4" /> Open camera
                      </button>
                      <button type="button" onClick={() => fileRef.current?.click()} className="btn-smu btn-smu-light btn-smu-sm">
                        <Upload className="h-4 w-4" /> Upload LCD photo
                      </button>
                    </div>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    onFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
              {(phase === "camera" || phase === "sending") && (
                <div className="flex gap-2 p-3">
                  <button
                    type="button"
                    onClick={capture}
                    disabled={phase === "sending"}
                    className="btn-smu btn-smu-gold flex-1 disabled:opacity-50"
                  >
                    {phase === "sending" ? "Reading LCD…" : "Scan LCD"}
                  </button>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={phase === "sending"} className="btn-smu btn-smu-outline disabled:opacity-40">
                    Upload instead
                  </button>
                  {phase === "camera" && (
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        setPhase("idle");
                      }}
                      className="btn-smu btn-smu-outline"
                    >
                      Stop
                    </button>
                  )}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3 rounded-md border border-black/10 bg-white p-5 font-mono text-[13px] shadow-card">
              <h2 className="font-display text-[24px] leading-8 text-smu-navy">Cloud endpoint</h2>
              <dl className="flex flex-col gap-2">
                <div className="flex justify-between gap-2">
                  <dt className="text-smu-muted">scale photo</dt>
                  <dd>{shotUrl ? "captured ✓" : "…"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-smu-muted">phone ocr</dt>
                  <dd className="tabular-nums">{result ? weight(result.kg) : "…"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-smu-muted">upload</dt>
                  <dd className={result ? "text-[#287a28]" : ""}>{result ? "sent ✓" : "…"}</dd>
                </div>
              </dl>
              {result && (
                <div className="mt-2 border-t border-black/10 pt-3 font-sans text-[13px] text-smu-muted">
                  <p>
                    <span className="font-semibold text-smu-navy">{result.pantry ?? bin?.name}</span> now
                    reads <span className="font-semibold tabular-nums">{weight(result.kg)}</span>.
                  </p>
                  <Link href={`/dashboard?bin=${selectedId}`} className="text-link mt-3 text-[13px]">
                    View on dashboard <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
              {error && (
                <p className="rounded border border-smu-danger/20 bg-smu-danger/5 px-3 py-2 font-sans text-[13px] text-smu-danger">
                  {error}
                </p>
              )}
              <p className="mt-auto border-t border-black/10 pt-3 font-sans text-[11px] text-black/40">
                Readings post to the database and appear in the dashboard audit trail.
              </p>
            </section>
          </div>
        </div>
      </section>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
