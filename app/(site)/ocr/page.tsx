"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Copy, FileImage, ScanLine, UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/smu/page-chrome";
import { BoxOverlay } from "@/components/smu/box-overlay";
import {
  ACCEPTED_TYPES,
  DEFAULT_LANG,
  LANGUAGES,
  MAX_BYTES,
  type Lang,
  type OcrLine,
} from "@/lib/languages";
import { runDemoOcr } from "@/lib/demo-ocr";

type Status = "idle" | "loading" | "done" | "error";

export default function OcrPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<OcrLine[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (status !== "loading") return;
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 400);
    return () => window.clearInterval(id);
  }, [status]);

  function selectFile(next: File | undefined) {
    if (!next) return;
    if (!ACCEPTED_TYPES.includes(next.type)) {
      setStatus("error");
      setError("Please choose a PNG, JPEG or WebP image.");
      return;
    }
    if (next.size > MAX_BYTES) {
      setStatus("error");
      setError("Image must be 4 MB or smaller.");
      return;
    }
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setImageSize(null);
    setLines([]);
    setError(null);
    setStatus("idle");
  }

  async function getImageSize(): Promise<{ width: number; height: number }> {
    if (imageSize) return imageSize;
    if (!previewUrl) return { width: 1200, height: 800 };
    const img = new Image();
    img.src = previewUrl;
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight };
  }

  async function runOcr() {
    if (!file) return;
    setStatus("loading");
    setElapsed(0);
    setError(null);
    setLines([]);
    try {
      const size = await getImageSize();
      const result = await runDemoOcr({ kind: "document", lang, size, delayMs: 1000 });
      setLines(result.lines);
      setStatus("done");
    } catch {
      setError("Something went wrong while reading the image.");
      setStatus("error");
    }
  }

  async function copyAll() {
    await navigator.clipboard.writeText(lines.map((l) => l.text).join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <PageHeader
        title="OCR reader"
        lead="Upload a photo of a scale display, collection log or receipt and inspect the extracted text. This demo uses a sample OCR engine."
        crumbs={[{ label: "Home", href: "/" }, { label: "Tools" }, { label: "OCR reader" }]}
        actions={
          <>
            <Link href="/scan" className="btn-smu btn-smu-outline">
              <ScanLine className="h-4 w-4" /> Scale scanner
            </Link>
            <Link href="/dashboard" className="btn-smu btn-smu-outline">
              Open dashboard <ArrowUpRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      <section className="bg-smu-cream pb-20 pt-8">
        <div className="container-smu">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px] text-smu-muted">
            <span className="rounded-full border border-smu-gold/30 bg-smu-gold/10 px-2.5 py-1 font-semibold uppercase tracking-[0.8px] text-smu-gold-dark">
              Demo OCR
            </span>
            The original PaddleOCR endpoint is replaced with a local sample so the prototype runs offline.
            <button
              type="button"
              onClick={() => {
                setStatus("done");
                setLines([]);
              }}
              className="font-semibold text-smu-gold-dark underline underline-offset-2"
            >
              Test empty result
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="flex flex-col gap-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  selectFile(e.dataTransfer.files[0]);
                }}
                className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors ${
                  dragging
                    ? "border-smu-gold bg-smu-gold/5"
                    : "border-black/15 bg-white/60 hover:border-smu-gold/60"
                }`}
              >
                <UploadCloud className="h-7 w-7 text-smu-gold" />
                <p className="font-semibold text-smu-navy">
                  {file ? file.name : "Drop an image here or click to browse"}
                </p>
                <p className="text-[13px] text-smu-muted">PNG, JPEG or WebP, up to 4 MB</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    selectFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-[13px]">
                  <span className="text-[11px] font-semibold uppercase tracking-[1px] text-smu-muted">
                    Language
                  </span>
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value as Lang)}
                    className="h-10 rounded border border-black/15 bg-white px-3 text-[14px] focus:border-smu-gold focus:outline-none"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={runOcr}
                  disabled={!file || status === "loading"}
                  className="btn-smu btn-smu-gold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {status === "loading" ? `Reading… ${elapsed}s` : "Extract text"}
                  <FileImage className="h-4 w-4" />
                </button>
              </div>

              {error && (
                <p className="rounded border border-smu-danger/20 bg-smu-danger/5 px-3 py-2 text-[13px] text-smu-danger">
                  {error}
                </p>
              )}

              {previewUrl && (
                <BoxOverlay
                  src={previewUrl}
                  lines={lines}
                  size={imageSize}
                  activeIndex={activeIndex}
                  onActiveChange={setActiveIndex}
                  onLoad={setImageSize}
                />
              )}
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[26px] leading-8 text-smu-navy">
                  Results{status === "done" && ` (${lines.length})`}
                </h2>
                {lines.length > 0 && (
                  <button type="button" onClick={copyAll} className="btn-smu btn-smu-outline btn-smu-sm">
                    <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy all"}
                  </button>
                )}
              </div>

              {status !== "done" && lines.length === 0 && (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-black/10 bg-white/60 p-6 text-center">
                  <FileImage className="h-8 w-8 text-black/20" />
                  <p className="mt-3 text-[14px] text-smu-muted">Extracted text will appear here.</p>
                </div>
              )}
              {status === "done" && lines.length === 0 && (
                <p className="text-[14px] text-smu-muted">No text found in this image.</p>
              )}

              {lines.length > 0 && (
                <ol className="divide-y divide-black/8 overflow-hidden rounded-md border border-black/10 bg-white shadow-card">
                  {lines.map((line, i) => (
                    <li
                      key={i}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseLeave={() => setActiveIndex(null)}
                      className={`px-4 py-3 text-[14px] transition-colors ${
                        i === activeIndex ? "bg-smu-gold/10" : ""
                      }`}
                    >
                      {line.text}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
