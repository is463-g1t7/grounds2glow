"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { Cleaner } from "@/lib/types";

const STEPS = ["Scan pass", "Pick pantry", "Weigh bin"] as const;

export function CleanerShell({
  step,
  cleaner,
  children,
}: {
  step: 1 | 2 | 3;
  cleaner?: Cleaner;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-smu-cream text-black">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:gap-6">
        <div className="overflow-hidden rounded-md bg-smu-navy text-white shadow-card">
          <div className="h-1 bg-smu-gold" />
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 lg:flex-nowrap lg:gap-8 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/" aria-label="SMU Circular Coffee home" className="shrink-0">
                <img src="/smu-logo-white.svg" alt="SMU" className="h-9 w-auto" />
              </Link>
              <span className="hidden h-8 w-px bg-white/20 sm:block" />
              <div className="min-w-0 max-lg:flex-1">
                <p className="truncate font-display text-[10px] uppercase tracking-[2px] text-smu-gold-light">
                  SMU Coffee Loop · Cleaner
                </p>
                <p className="font-display text-[20px] leading-6">Grounds drop-off</p>
              </div>
            </div>

            <Steps step={step} />

            {cleaner ? (
              <Link href="/cleaner"
                className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-[12px] transition-colors hover:bg-white/20"
                title="Sign out"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-smu-gold text-[10px] font-bold text-white">
                  {cleaner.initials}
                </span>
                <span className="max-w-28 truncate">{cleaner.name}</span>
              </Link>
            ) : (
              <Link href="/dashboard"
                className="shrink-0 text-[12px] text-white/75 underline underline-offset-2 hover:text-white"
              >
                Dashboard →
              </Link>
            )}
          </div>
        </div>
        {children}
        <p className="pb-2 text-center text-[11px] text-black/35">
          SMU Circular Coffee · Cleaner app
        </p>
      </div>
    </div>
  );
}

function Steps({ step }: { step: number }) {
  return (
    <ol className="order-last grid w-full grid-cols-3 gap-1 lg:order-none lg:max-w-md lg:flex-1 lg:gap-2">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "now" : "next";
        return (
          <li key={label} className="flex flex-col gap-1" aria-current={state === "now" ? "step" : undefined}>
            <span className={`h-1 rounded-full ${state === "next" ? "bg-white/20" : "bg-smu-gold"}`} />
            <span
              className={`text-[10.5px] lg:text-[11.5px] ${
                state === "now" ? "font-semibold text-white" : "text-white/55"
              }`}
            >
              {n}. {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function StepColumns({
  main,
  side,
  narrowMain = false,
}: {
  main: ReactNode;
  side: ReactNode;
  narrowMain?: boolean;
}) {
  const cols = narrowMain
    ? "lg:grid-cols-[440px_minmax(0,1fr)]"
    : "lg:grid-cols-[minmax(0,1fr)_380px]";
  return (
    <div className={`flex flex-col gap-4 lg:grid lg:items-start lg:gap-6 ${cols}`}>
      <div className="flex min-w-0 flex-col gap-4">{main}</div>
      <div className="flex flex-col gap-4 lg:sticky lg:top-5">{side}</div>
    </div>
  );
}

export function NeedsPass() {
  return (
    <div className="rounded-md border border-black/10 bg-white p-6 text-sm shadow-card">
      <p className="font-display text-[24px] leading-7 text-smu-navy">Scan your staff pass first</p>
      <p className="mt-2 text-[14px] leading-6 text-smu-muted">
        Every drop-off is logged against a cleaner for the audit trail.
      </p>
      <Link href="/cleaner" className="btn-smu btn-smu-gold mt-4">
        Go to pass scanner
      </Link>
    </div>
  );
}
