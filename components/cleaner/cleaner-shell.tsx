"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { applyStationParams, setDemoMode, useDemoMode } from "@/lib/client/station";
import type { Cleaner } from "@/lib/types";

const STEPS = ["Scan pass", "Choose pantry", "Weigh"] as const;

/** Signs the cleaner out after this long without touching the laptop. */
const IDLE_MS = 90_000;
/** How long the sign-out warning shows before it happens. */
const WARN_MS = 15_000;

export function CleanerShell({
  step,
  cleaner,
  where,
  idleMs = IDLE_MS,
  pauseIdle = false,
  children,
}: {
  step: 1 | 2 | 3;
  cleaner?: Cleaner;
  /** The bin this drop-off is for, shown under the title. */
  where?: string;
  idleMs?: number;
  /** Keeps the cleaner signed in while something is running, such as reading a photo. */
  pauseIdle?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const demo = useDemoMode();

  useEffect(() => {
    applyStationParams();
  }, []);

  const secondsLeft = useIdleSignOut(Boolean(cleaner) && !pauseIdle, idleMs, () =>
    router.push("/cleaner"),
  );

  return (
    <div className="flex min-h-dvh flex-col bg-smu-cream text-black">
      <header className="bg-smu-navy text-white">
        <div className="h-1 bg-smu-gold" />
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" aria-label="SMU Circular Coffee home" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/smu-logo-white.svg" alt="SMU" className="h-9 w-auto" />
            </Link>
            <span className="hidden h-9 w-px bg-white/20 sm:block" />
            <div className="min-w-0">
              <p className="font-display text-[22px] leading-7">Grounds drop-off</p>
              <p className="truncate text-[14px] leading-5 text-white/75">
                {where ?? "Cleaner station"}
              </p>
            </div>
          </div>

          <Steps step={step} />

          <div className="ml-auto flex items-center gap-3">
            {demo && (
              <button
                type="button"
                onClick={() => setDemoMode(false)}
                aria-label="Turn off demo mode"
                title="Turn off demo mode"
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-smu-gold-light/60 py-1 pl-3 pr-2 text-[13px] font-semibold text-smu-gold-light transition-colors hover:bg-white/10"
              >
                Demo<span className="max-sm:hidden"> mode</span> <X className="h-3.5 w-3.5" />
              </button>
            )}
            {cleaner && (
              <>
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="grid h-9 w-9 place-items-center rounded-full bg-smu-gold text-[13px] font-bold"
                  >
                    {cleaner.initials}
                  </span>
                  <span className="max-w-40 truncate text-[15px] font-semibold max-sm:hidden">
                    {cleaner.name}
                  </span>
                </span>
                <Link
                  href="/cleaner"
                  className="flex h-10 items-center gap-2 whitespace-nowrap rounded border border-white/40 px-3 text-[14px] font-semibold transition-colors hover:bg-white hover:text-smu-navy"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:py-8">
        {children}
      </main>

      {secondsLeft != null && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div
            role="alert"
            className="fade-up pointer-events-auto flex items-center gap-4 rounded-md bg-smu-navy py-3 pl-5 pr-3 text-white shadow-[0_12px_32px_-12px_rgb(13_18_56/0.6)]"
          >
            <p className="text-[16px]">
              Signing {cleaner?.name.split(" ")[0] ?? "you"} out in{" "}
              <span className="font-semibold tabular-nums">{secondsLeft}s</span>
            </p>
            <button type="button" className="btn-smu btn-smu-gold">
              I&apos;m still here
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Counts down while nobody touches the laptop, so the next cleaner isn't logged under someone
 * else's name. Returns the seconds left once the warning shows, otherwise null.
 */
function useIdleSignOut(enabled: boolean, idleMs: number, onTimeout: () => void): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timeoutRef = useRef(onTimeout);

  useEffect(() => {
    timeoutRef.current = onTimeout;
  });

  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    const activity = () => {
      last = Date.now();
    };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
    events.forEach((name) => window.addEventListener(name, activity, { passive: true }));
    const timer = window.setInterval(() => {
      const left = idleMs - (Date.now() - last);
      if (left <= 0) {
        window.clearInterval(timer);
        timeoutRef.current();
        return;
      }
      setSecondsLeft(left <= WARN_MS ? Math.ceil(left / 1000) : null);
    }, 250);
    return () => {
      events.forEach((name) => window.removeEventListener(name, activity));
      window.clearInterval(timer);
      setSecondsLeft(null);
    };
  }, [enabled, idleMs]);

  return enabled ? secondsLeft : null;
}

function Steps({ step }: { step: number }) {
  return (
    <ol className="order-last flex w-full items-center gap-2 lg:order-none lg:w-auto lg:flex-1 lg:justify-center">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "now" : "next";
        return (
          <li
            key={label}
            aria-current={state === "now" ? "step" : undefined}
            className={`flex items-center gap-2 lg:flex-none ${
              state === "now" ? "shrink-0" : "min-w-0 flex-1"
            }`}
          >
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold ${
                state === "now"
                  ? "bg-smu-gold text-white"
                  : state === "done"
                    ? "bg-white/90 text-smu-navy"
                    : "border border-white/35 text-white/70"
              }`}
            >
              {n}
            </span>
            <span
              className={`truncate text-[14px] ${
                state === "now" ? "font-semibold text-white" : "text-white/70"
              } ${state === "now" ? "" : "max-sm:hidden"}`}
            >
              {label}
            </span>
            {n < STEPS.length && <span aria-hidden className="h-px w-6 shrink-0 bg-white/25 max-lg:flex-1" />}
          </li>
        );
      })}
    </ol>
  );
}

/** The white working surface every step sits on. */
export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-md border border-black/10 bg-white shadow-card ${className}`}>
      {children}
    </section>
  );
}

export function NeedsPass() {
  return (
    <Panel className="max-w-xl p-6">
      <h1 className="font-display text-[30px] leading-9 text-smu-navy">Scan your staff pass first</h1>
      <p className="mt-2 text-[16px] leading-6 text-smu-muted">
        Every drop-off is logged against the cleaner who made it.
      </p>
      <Link href="/cleaner" className="btn-smu btn-smu-gold mt-5">
        Go to pass scanner
      </Link>
    </Panel>
  );
}

export function LoadingPanel({ label }: { label: string }) {
  return (
    <Panel className="p-6">
      <p className="text-[16px] text-smu-muted" role="status">
        {label}
      </p>
    </Panel>
  );
}
