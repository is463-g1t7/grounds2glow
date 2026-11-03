"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Coffee,
  Droplets,
  Leaf,
  QrCode,
  ScanLine,
  Sparkles,
  X,
} from "lucide-react";
import { KioskChat } from "@/components/kiosk/KioskChat";

const steps = [
  {
    title: "Collect",
    text: "Used coffee grounds are gathered from staff pantries across SMU’s seven buildings.",
    Icon: Coffee,
  },
  {
    title: "Deposit",
    text: "Coffee grounds are deposited in smart collection bins within each building.",
    Icon: ScanLine,
  },
  {
    title: "Transport",
    text: "Volunteers bring the collected grounds to the Grounds to Glow kiosk.",
    Icon: Leaf,
  },
  {
    title: "Prepare",
    text: "A solar dehydrator dries the grounds before they are prepared for the scrubs.",
    Icon: Sparkles,
  },
];

const benefits = [
  ["Exfoliation", "Helps remove dead skin cells, leaving the skin feeling smoother and softer."],
  ["Smoother skin appearance", "Exfoliation may temporarily improve the appearance and texture of the skin."],
  ["Antioxidants", "Coffee naturally contains antioxidant compounds."],
  ["Refreshing experience", "Coffee’s natural aroma makes the exfoliation process enjoyable."],
];

const recipes = {
  gentle: { name: "Gentle", description: "Less coffee grounds", coffee: 3, sugar: 6, oil: 7.5 },
  standard: { name: "Standard", description: "Balanced exfoliation", coffee: 5, sugar: 6, oil: 7.5 },
  moisturising: { name: "Moisturising", description: "More moisturising oil", coffee: 5, sugar: 6, oil: 10 },
} as const;

type RecipeKey = keyof typeof recipes;

export function KioskFlow() {
  const params = useSearchParams();
  const chatMode = params.get("chat") === "1";
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");

  const restart = () => {
    setStep(0);
    setName("");
  };

  if (chatMode) {
    return <KioskChatScreen />;
  }

  return (
    <div className="min-h-screen bg-[#f3eee7] text-black">
      <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col">
        <KioskTopBar step={step} onHome={restart} />
        {step === 0 && <Welcome onStart={() => setStep(1)} />}
        {step === 1 && <CheckIn name={name} onName={setName} onNext={() => setStep(2)} />}
        {step === 2 && (
          <Guide name={name} onNext={() => setStep(3)} />
        )}
        {step === 3 && <Recipe onDispense={() => setStep(4)} />}
        {step === 4 && <Dispensing onDone={() => setStep(5)} />}
        {step === 5 && <Thanks name={name} onRestart={restart} />}
      </div>
    </div>
  );
}

function KioskTopBar({ step, onHome }: { step: number; onHome: () => void }) {
  return (
    <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
      <button type="button" onClick={onHome} className="flex items-center gap-3 text-left" aria-label="Return to welcome">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/smu-logo.svg" alt="SMU" className="h-10 w-auto" />
        <span className="hidden h-8 w-px bg-black/15 sm:block" />
        <span className="leading-none">
          <span className="block font-display text-[22px] leading-6 text-smu-navy">Grounds to Glow</span>
          <span className="mt-1 block text-[9.5px] font-bold uppercase tracking-[2px] text-smu-gold-dark">
            Coffee scrub station
          </span>
        </span>
      </button>

      {step > 0 && step < 4 && (
        <div className="flex items-center gap-4">
          <span className="hidden text-[12px] font-semibold text-smu-muted sm:block">
            Step {step} of 3
          </span>
          <div
            className="flex gap-2"
            role="progressbar"
            aria-label={`Step ${step} of 3`}
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={step}
          >
            {[1, 2, 3].map((item) => (
              <span
                key={item}
                className={`h-2.5 rounded-full transition-all ${
                  item <= step ? "w-8 bg-smu-gold" : "w-2.5 bg-black/15"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <Link
        href="/"
        className="hidden text-[11px] font-semibold text-black/40 underline underline-offset-2 hover:text-smu-navy sm:block"
      >
        Exit kiosk
      </Link>
    </header>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <main className="flex flex-1 flex-col px-5 pb-16 sm:px-8 lg:px-12">
      <section className="py-10 lg:py-14">
        <div className="max-w-5xl">
          <p className="font-display text-[13px] uppercase tracking-[3px] text-smu-gold-dark">
            SMU · Office of Campus Infrastructure & Services
          </p>
          <h1 className="mt-4 font-display text-[clamp(3.6rem,7vw,7rem)] font-normal leading-[0.95] tracking-[-0.03em] text-smu-navy">
            Grounds to <span className="text-smu-gold">Glow.</span>
          </h1>
          <p className="mt-7 max-w-3xl text-[20px] leading-[30px] text-black">
            An initiative by{" "}
            <strong className="font-semibold text-black">
              SMU’s Office of Campus Infrastructure & Services (OCIS)
            </strong>{" "}
            that aims to reduce campus waste, raise environmental awareness and promote circularity
            within the SMU community by giving coffee grounds a second life.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={onStart} className="btn-smu btn-smu-gold px-7 py-3 text-[15px]">
              Make your coffee scrub <ArrowRight className="h-4 w-4" />
            </button>
            <a href="#process" className="btn-smu btn-smu-outline px-7 py-3 text-[15px]">
              Explore how it works <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </section>

      <section id="process" className="scroll-mt-6 border-t border-black/10 py-10">
        <h2 className="font-display text-[36px] leading-10 text-smu-navy">From grounds to glow</h2>
        <ol className="mt-7 grid gap-4 md:grid-cols-2">
          {steps.map(({ title, text, Icon }, index) => (
            <li key={title} className="rounded-md border border-black/10 bg-white p-6 shadow-card">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded bg-smu-gold/12 text-smu-gold">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-[24px] leading-7 text-smu-navy">{title}</h3>
                <span className="ml-auto font-display text-[22px] text-black/15">0{index + 1}</span>
              </div>
              <p className="mt-4 text-[14px] leading-6 text-smu-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-2 rounded-md bg-smu-navy px-7 py-9 text-white sm:px-9">
        <h2 className="font-display text-[34px] leading-10 text-white">Benefits of coffee scrubs</h2>
        <div className="mt-6 grid gap-x-8 gap-y-6 md:grid-cols-2">
          {benefits.map(([title, text], index) => (
            <article key={title} className="flex items-start gap-3">
              <span className="w-8 shrink-0 font-display text-[24px] leading-7 text-smu-gold-light">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-[13.5px] font-semibold text-white">{title}</h3>
                <p className="mt-1 text-[13px] leading-6 text-white/60">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <p className="mt-6 text-center text-[11px] text-black/35">
        Demo kiosk · state is not saved between sessions
      </p>
    </main>
  );
}

function CheckIn({
  name,
  onName,
  onNext,
}: {
  name: string;
  onName: (value: string) => void;
  onNext: () => void;
}) {
  const [scanning, setScanning] = useState(false);

  const scanStudentId = () => {
    setScanning(true);
    window.setTimeout(() => {
      onName("Julie Smith");
      setScanning(false);
    }, 1200);
  };

  return (
    <main className="grid flex-1 place-items-center px-5 pb-12">
      <div className="w-full max-w-5xl overflow-hidden rounded-md bg-white shadow-card">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative overflow-hidden bg-smu-navy p-9 text-white lg:p-12">
            <div className="absolute -right-24 -top-20 h-72 w-72 rounded-full border-[45px] border-white/5" />
            <p className="font-display text-[13px] uppercase tracking-[3px] text-smu-gold-light">
              Welcome to the loop
            </p>
            <h2 className="mt-5 font-display text-[44px] leading-[1.05] text-white">
              Give your grounds
              <br />
              a second life.
            </h2>
            <p className="mt-6 max-w-sm text-[14px] leading-6 text-white/65">
              Check in so we can personalise your scrub and keep the dispenser loop moving. Your name
              is only used on this kiosk.
            </p>
            <div className="mt-10 flex items-center gap-3 text-[12px] text-white/50">
              <Leaf className="h-4 w-4 text-smu-gold-light" />
              Powered by SMU Circular Coffee
            </div>
          </section>

          <section className="p-8 lg:p-12">
            <p className="font-display text-[12px] uppercase tracking-[2px] text-smu-gold-dark">
              Step 1 · Check in
            </p>
            <h1 className="mt-3 font-display text-[44px] leading-[1.05] text-smu-navy">
              What’s your name?
            </h1>
            <label className="mt-8 block text-[12px] font-semibold text-smu-muted" htmlFor="kiosk-name">
              Your name
            </label>
            <input
              autoFocus
              id="kiosk-name"
              value={name}
              onChange={(event) => onName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && name.trim() && onNext()}
              placeholder="Enter your first name"
              className="mt-2 h-14 w-full rounded border border-black/15 bg-white px-4 text-[17px] text-black outline-none transition placeholder:text-black/25 focus:border-smu-gold"
            />
            <div className="my-5 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[1.5px] text-black/30">
              <span className="h-px flex-1 bg-black/10" /> or <span className="h-px flex-1 bg-black/10" />
            </div>
            <button
              type="button"
              disabled={scanning}
              onClick={scanStudentId}
              className={`flex h-14 w-full items-center justify-center gap-3 rounded border-2 border-dashed transition ${
                scanning
                  ? "border-smu-gold bg-smu-gold/5 text-smu-gold-dark"
                  : "border-black/15 text-smu-muted hover:border-smu-gold hover:bg-smu-cream/40"
              }`}
            >
              {scanning ? <ScanLine className="h-5 w-5 animate-pulse" /> : <QrCode className="h-5 w-5" />}
              <span className="font-semibold">
                {scanning ? "Scanning student ID…" : "Scan SMU ID barcode"}
              </span>
            </button>
            {name === "Julie Smith" && !scanning && (
              <div className="mt-3 flex items-center justify-center gap-2 text-[13px] font-semibold text-[#287a28]">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-smu-success/10">
                  <Check className="h-3.5 w-3.5" />
                </span>
                SMU ID scanned successfully
              </div>
            )}
            <button
              type="button"
              disabled={!name.trim()}
              onClick={onNext}
              className="btn-smu btn-smu-gold mt-6 w-full disabled:opacity-40"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

function Guide({ name, onNext }: { name: string; onNext: () => void }) {
  const [qr, setQr] = useState("");
  const [scanState, setScanState] = useState<"idle" | "scanning" | "chat">("idle");

  useEffect(() => {
    const url = `${window.location.origin}/kiosk?chat=1`;
    QRCode.toDataURL(url, {
      color: { dark: "#141B4D", light: "#ffffff" },
      errorCorrectionLevel: "M",
      margin: 2,
      width: 640,
    })
      .then(setQr)
      .catch(() => setQr(""));
  }, []);

  useEffect(() => {
    if (scanState !== "scanning") return;
    const timer = window.setTimeout(() => setScanState("chat"), 1200);
    return () => window.clearTimeout(timer);
  }, [scanState]);

  useEffect(() => {
    if (scanState === "idle") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setScanState("idle");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scanState]);

  return (
    <>
      <main className="flex flex-1 items-center px-5 py-10 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-9 text-center">
            <p className="font-display text-[12px] uppercase tracking-[3px] text-smu-gold-dark">
              Step 2 · Your guide
            </p>
            <h1 className="mt-3 font-display text-[clamp(2.8rem,5vw,4.7rem)] leading-[1.02] tracking-[-0.02em] text-smu-navy">
              Hi {name}, <span className="text-smu-gold">welcome.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[16px] leading-6 text-black">
              Ask our AI guide a question or take a short skincare quiz. When you’re ready, choose your
              recipe and make your scrub.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="flex flex-col items-center rounded-md border border-black/10 bg-white p-8 text-center shadow-card sm:p-10">
              <p className="font-display text-[12px] uppercase tracking-[2px] text-smu-gold-dark">
                On your phone
              </p>
              <h2 className="mt-2 font-display text-[30px] leading-8 text-smu-navy">Grounds to Glow AI</h2>
              {qr ? (
                <button
                  type="button"
                  onClick={() => setScanState("scanning")}
                  className="mt-6 w-full max-w-[210px] rounded border border-black/10 bg-white p-3 transition-transform hover:-translate-y-1 hover:border-smu-gold"
                  aria-label="Scan QR code to open Grounds to Glow AI"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="QR code to open the Grounds to Glow AI guide" className="w-full" />
                </button>
              ) : (
                <a
                  href="/kiosk?chat=1"
                  className="mt-6 flex min-h-40 w-full max-w-[210px] items-center justify-center rounded border border-black/10 bg-smu-cream/40 p-6 text-[13px] font-semibold text-smu-gold-dark underline"
                >
                  Open the Grounds to Glow AI guide
                </a>
              )}
              <p className="mt-6 max-w-sm text-[13px] leading-6 text-smu-muted">
                Scan to learn about our initiative, ask questions about coffee scrubs, or take a
                skincare quiz.
              </p>
            </section>

            <section className="relative flex flex-col items-center justify-center overflow-hidden rounded-md bg-smu-navy p-8 text-center text-white shadow-card sm:p-10">
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[45px] border-white/5" />
              <div className="relative">
                <p className="font-display text-[12px] uppercase tracking-[2px] text-smu-gold-light">
                  At the station
                </p>
                <h2 className="mt-3 font-display text-[36px] leading-[1.05] text-white">
                  Make your own
                  <br />
                  <span className="text-smu-gold-light">coffee scrub.</span>
                </h2>
                <p className="mx-auto mt-5 max-w-xs text-[13px] leading-6 text-white/60">
                  Choose your preferred recipe and let the smart dispenser do the rest.
                </p>
                <button
                  type="button"
                  onClick={() => onNext()}
                  className="btn-smu btn-smu-gold mt-7 px-7 py-3"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      {scanState !== "idle" && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={scanState === "scanning" ? "Scanning QR code" : "Grounds to Glow AI chat"}
          className="fixed inset-0 z-50 grid place-items-center bg-smu-navy-deep/70 p-4 backdrop-blur-[2px]"
        >
          {scanState === "scanning" ? (
            <section className="w-full max-w-sm rounded-md bg-[#f3eee7] p-10 text-center shadow-2xl">
              <div className="relative mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded bg-white text-smu-gold shadow-sm">
                <ScanLine className="h-12 w-12" />
                <span className="scanline absolute left-3 right-3 top-4 h-0.5 bg-smu-gold shadow-[0_0_10px_rgba(138,112,76,0.8)]" />
              </div>
              <p className="mt-7 font-display text-[28px] leading-8 text-smu-navy">Scanning QR code…</p>
              <p className="mt-2 text-[13px] text-smu-muted">Connecting to Grounds to Glow AI</p>
            </section>
          ) : (
            <section className="flex h-[min(860px,92vh)] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
              <header className="flex items-center justify-between border-b border-black/10 px-5 py-4 sm:px-6">
                <div>
                  <p className="font-display text-[20px] leading-6 text-smu-navy">Grounds to Glow AI</p>
                  <p className="text-[11px] text-smu-muted">Ask questions and take the skincare quiz</p>
                </div>
                <button
                  type="button"
                  autoFocus
                  onClick={() => setScanState("idle")}
                  className="btn-smu btn-smu-outline btn-smu-sm"
                >
                  <X className="h-3.5 w-3.5" /> Close chat
                </button>
              </header>
              <KioskChat />
            </section>
          )}
        </div>
      )}
    </>
  );
}

function Recipe({ onDispense }: { onDispense: () => void }) {
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeKey>("standard");
  const recipe = recipes[selectedRecipe];
  const ingredients = useMemo(
    () => [
      { key: "coffee", label: "Dried coffee grounds", unit: "g", value: recipe.coffee, note: "Exfoliates" },
      { key: "sugar", label: "Sugar", unit: "g", value: recipe.sugar, note: "Smooths" },
      { key: "oil", label: "Oil", unit: "ml", value: recipe.oil, note: "Moisturises" },
    ],
    [recipe]
  );
  const warnings = [
    ["Sensitive skin", "Coffee grounds, sugar and essential oils may cause irritation. Avoid using the scrub on sensitive or damaged skin."],
    ["Avoid sensitive areas", "Do not apply the scrub to your face, around your eyes, or on broken or irritated skin."],
    ["Allergies", "Check all ingredients before use, as some may cause allergic reactions or skin irritation."],
    ["Stop if irritation occurs", "Rinse off immediately if you experience redness, itching, burning or discomfort."],
  ];
  const makeSteps = [
    "Take a paper cup provided at the kiosk and place it under the smart dispenser.",
    "Choose your preferred coffee scrub recipe using the options above.",
    "Click “Dispense coffee scrub” to dispense the ingredients.",
    "Optionally, add 1–2 drops of an essential oil provided at the kiosk for added fragrance.",
    "Use the provided spoon to mix the ingredients thoroughly.",
    "Your DIY coffee scrub is ready to use!",
  ];

  const prepPanels: { title: string; items: string[]; Icon: typeof Coffee }[] = [
    { title: "Preparation", items: makeSteps.slice(0, 3), Icon: Coffee },
    { title: "Finishing touches", items: makeSteps.slice(3), Icon: Droplets },
  ];

  const usagePanels: { title: string; items: string[]; Icon: typeof Coffee }[] = [
    {
      title: "How to use",
      items: [
        "Apply a small amount to clean, damp body skin.",
        "Massage gently in circular motions without excessive scrubbing and keep on for 3–5 minutes.",
        "Avoid your face, eye area, and broken or irritated skin.",
        "Rinse with lukewarm water and gently pat your skin dry.",
      ],
      Icon: Coffee,
    },
    {
      title: "Storage & disposal",
      items: [
        "Use the coffee scrub immediately after preparation.",
        "Do not store or reuse leftover scrub to minimise microbial contamination.",
      ],
      Icon: Droplets,
    },
  ];

  return (
    <main className="flex flex-1 flex-col px-5 pb-16 sm:px-8 lg:px-16">
      <h1 className="sr-only">Dispense your coffee scrub</h1>

      <section aria-labelledby="warnings-title" className="mx-auto w-full max-w-5xl py-6">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-smu-danger text-lg font-bold text-white">
            !
          </span>
          <h2 id="warnings-title" className="font-display text-[32px] leading-9 text-smu-navy">
            Before you start
          </h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {warnings.map(([title, text], index) => (
            <div key={title} className="rounded-md border border-black/10 bg-white p-5 shadow-card">
              <div className="flex items-start gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-smu-gold/10 text-[12px] font-bold text-smu-gold-dark">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-[13.5px] font-semibold text-smu-navy">{title}</h3>
                  <p className="mt-1 text-[12.5px] leading-5 text-smu-muted">{text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl border-t border-black/10 py-6">
        <h2 className="font-display text-[32px] leading-9 text-smu-navy">Make your own coffee scrub</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {prepPanels.map(({ title, items, Icon }, panelIndex) => (
            <div key={title} className="rounded-md border border-black/10 bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded bg-smu-gold/10 text-smu-gold">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-[24px] leading-7 text-smu-navy">{title}</h3>
              </div>
              <div className="mt-5 space-y-4">
                {items.map((instruction, index) => (
                  <div key={instruction} className="flex items-start gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-smu-cream text-[10px] font-bold text-smu-gold-dark">
                      {panelIndex === 0 ? index + 1 : index + 4}
                    </span>
                    <p className="text-[12.5px] leading-5 text-smu-muted">{instruction}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl border-t border-black/10 py-6">
        <h2 className="font-display text-[32px] leading-9 text-smu-navy">Choose your coffee scrub recipe</h2>
        <div className="mt-5 rounded-md border border-black/10 bg-white p-5 shadow-card md:p-8">
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.entries(recipes) as [RecipeKey, (typeof recipes)[RecipeKey]][]).map(([key, option]) => {
              const isSelected = selectedRecipe === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedRecipe(key)}
                  className={`relative rounded border-2 p-5 text-left transition-all ${
                    isSelected ? "border-smu-gold bg-smu-gold/5" : "border-black/10 bg-white hover:border-black/25"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold text-smu-navy">{option.name}</span>
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                        isSelected ? "border-smu-gold bg-smu-gold text-white" : "border-black/20"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                  </div>
                  <p className="mt-2 text-[12px] leading-5 text-smu-muted">{option.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-8 border-t border-black/8 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-[14px] font-semibold text-smu-navy">Ingredients</h3>
                <p className="mt-1 text-[12px] text-smu-muted">{recipe.name} recipe · single-use portion</p>
              </div>
              <span className="rounded-full bg-smu-cream px-3 py-1.5 text-[10.5px] font-semibold text-smu-gold-dark">
                3 ingredients
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {ingredients.map((ingredient) => (
                <div key={ingredient.key} className="flex items-center gap-3 rounded bg-smu-cream/50 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-white text-smu-gold shadow-sm">
                    {ingredient.key === "coffee" ? <Coffee className="h-5 w-5" /> : ingredient.key === "sugar" ? <Sparkles className="h-5 w-5" /> : <Droplets className="h-5 w-5" />}
                  </span>
                  <div>
                    <p className="text-[12.5px] font-semibold text-smu-navy">{ingredient.label}</p>
                    <p className="text-[10.5px] text-smu-muted">{ingredient.note}</p>
                    <p className="mt-1 font-display text-[20px] leading-6 text-smu-navy">
                      {ingredient.value}
                      <span className="ml-1 font-sans text-[10px] font-semibold text-black/40">
                        {ingredient.unit}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 border-t border-black/8 pt-6 text-center">
            <button type="button" onClick={onDispense} className="btn-smu btn-smu-gold px-8 py-3 text-[15px]">
              Dispense coffee scrub <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl border-t border-black/10 py-6">
        <h2 className="font-display text-[30px] leading-9 text-smu-navy">Usage & storage instructions</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {usagePanels.map(({ title, items, Icon }) => (
            <div key={title} className="rounded-md border border-black/10 bg-white p-5 shadow-card">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded bg-smu-gold/10 text-smu-gold">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-display text-[24px] leading-7 text-smu-navy">{title}</h3>
              </div>
              <div className="mt-5 space-y-4">
                {items.map((instruction, index) => (
                  <div key={instruction} className="flex items-start gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-smu-cream text-[10px] font-bold text-smu-gold-dark">
                      {index + 1}
                    </span>
                    <p className="text-[12.5px] leading-5 text-smu-muted">{instruction}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Dispensing({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(8);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 100) {
          window.clearInterval(timer);
          window.setTimeout(onDone, 700);
          return 100;
        }
        return Math.min(100, value + 4);
      });
    }, 90);
    return () => window.clearInterval(timer);
  }, [onDone]);

  return (
    <main className="grid flex-1 place-items-center px-5 pb-10 text-center">
      <div className="w-full max-w-xl">
        <div className="relative mx-auto grid h-48 w-48 place-items-center rounded-full bg-smu-gold/10 text-smu-gold">
          <div className="absolute inset-3 animate-[spin_3s_linear_infinite] rounded-full border-2 border-dashed border-smu-gold/50" />
          <Coffee className="h-16 w-16" />
        </div>
        <h1 className="mt-6 font-display text-[48px] leading-[1.05] text-smu-navy">
          Dispensing ingredients…
        </h1>
        <p className="mt-4 text-[15px] text-smu-muted">
          Please keep your cup in place while each ingredient is dispensed.
        </p>
        <div className="mt-8 h-3 overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full rounded-full bg-smu-gold transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-[12px] font-bold text-smu-muted">
          <span>{progress}%</span>
          <span>{progress < 100 ? "Dispensing" : "Complete"}</span>
        </div>
      </div>
    </main>
  );
}

function Thanks({ name, onRestart }: { name: string; onRestart: () => void }) {
  return (
    <main className="grid flex-1 place-items-center px-5 pb-10 text-center">
      <section className="w-full max-w-3xl rounded-md bg-smu-navy px-8 py-12 text-white sm:px-12 sm:py-14">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-smu-gold">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h1 className="mx-auto mt-6 max-w-2xl font-display text-[clamp(2.2rem,4vw,3.2rem)] leading-[1.1] text-white">
          Thanks for giving coffee grounds
          <br />
          <span className="text-smu-gold-light">a second life, {name}!</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[13px] leading-6 text-white/65">
          Your coffee scrub is ready! Mix well, apply gently to damp skin, and rinse thoroughly. Patch
          test before first use.
        </p>
        <button type="button" onClick={onRestart} className="btn-smu btn-smu-light mt-8">
          Back to kiosk
        </button>
      </section>
    </main>
  );
}

function KioskChatScreen() {
  return (
    <div className="flex min-h-screen flex-col bg-[#f3eee7]">
      <header className="flex items-center justify-between gap-4 border-b border-black/10 bg-[#f3eee7] px-4 py-3 sm:px-8">
        <Link href="/kiosk" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/smu-logo.svg" alt="SMU" className="h-9 w-auto" />
          <span className="h-8 w-px bg-black/15" />
          <span className="leading-none">
            <span className="block font-display text-[20px] leading-6 text-smu-navy">Grounds to Glow AI</span>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[2px] text-smu-gold-dark">
              Coffee scrub guide
            </span>
          </span>
        </Link>
        <Link href="/kiosk" className="btn-smu btn-smu-outline btn-smu-sm">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to kiosk
        </Link>
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-3 pb-3 pt-3 sm:px-4">
        <div className="mb-3 rounded-md bg-smu-navy p-5 text-white">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded bg-smu-gold">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-[26px] leading-7">Grounds to Glow AI</h1>
              <p className="mt-1 text-[12px] leading-5 text-white/60">
                Coffee scrub guidance and the skincare quiz. Built-in guide; don’t share personal or
                medical information.
              </p>
            </div>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-card">
          <KioskChat />
        </div>
      </main>
    </div>
  );
}
