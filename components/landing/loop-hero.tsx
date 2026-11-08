import { weight } from "@/lib/format";
import { ArrowDown } from "lucide-react";
import Link from "next/link";
import { ago } from "@/lib/analytics";
import { SCALE_FRAMES } from "@/lib/scales";
import type { Bin, BinEvent } from "@/lib/types";
import { latestDeposit, LiveDot, ScaleReadout, StageMark } from "./shared";

export function LoopHero({
  bins,
  events,
  loading,
  error,
  now,
}: {
  bins: Bin[];
  events: BinEvent[];
  loading: boolean;
  error: string | null;
  now: number;
}) {
  const total = bins.reduce((sum, bin) => sum + bin.weightKg, 0);
  const levels = bins.reduce((sum, bin) => sum + bin.levels, 0);
  const latest = latestDeposit(events);
  const hasData = !loading && bins.length > 0;

  const stages = [
    {
      stage: 1 as const,
      title: "Pantry staff",
      text: "Scan a pass, pick a pantry and weigh the bin.",
      live: hasData ? `${levels} pantry levels across ${bins.length} buildings` : null,
      href: "#pantry",
    },
    {
      stage: 2 as const,
      title: "Smart bin OCR and dashboard",
      text: "OCR reads the scale and the dashboard updates in seconds.",
      live: hasData ? `${weight(total)} in the bins right now` : null,
      href: "#dashboard",
    },
    {
      stage: 3 as const,
      title: "Grounds to Glow kiosk",
      text: "Grounds become a body scrub, with an AI guide to ask.",
      live: "Ask the guide on this page",
      href: "#kiosk",
    },
  ];

  return (
    <section id="loop" className="relative scroll-mt-[100px] overflow-hidden bg-smu-navy-deep text-white">
      <div className="relative xl:min-h-[36.8vw]">
        <div className="hero-photo mt-[100px] xl:absolute xl:right-0 xl:top-0 xl:mt-0 xl:w-[66%]">
          <ScaleReadout
            frame={SCALE_FRAMES[1]}
            sizes="(min-width: 1280px) 66vw, 100vw"
            eager
          />
        </div>

        <div className="container-smu relative pb-12 pt-10 xl:pb-10 xl:pt-[128px]">
          <div className="xl:max-w-[33%]">
            <p className="font-display text-[18px] uppercase leading-6 tracking-[0.06em] text-smu-gold-light">
              SMU Circular Coffee
            </p>
            <h1 className="display-hero mt-4">From pantry bin to body scrub</h1>
            <p className="mt-5 max-w-[56ch] text-[18px] leading-7 text-white">
              Follow SMU&apos;s spent coffee grounds through the whole loop, and try each part
              yourself.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#try" className="cta cta-gold">
                Try the 3-minute demo
              </a>
              <Link href="/dashboard" className="cta cta-outline-light">
                Open the live dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/15 bg-smu-navy">
        <div className="container-smu">
          <ol className="grid md:grid-cols-3">
            {stages.map((item) => (
              <li
                key={item.stage}
                className="border-b border-white/15 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              >
                <a
                  href={item.href}
                  className="group flex h-full gap-4 py-6 transition-colors hover:bg-white/[0.04] md:px-6 md:first:pl-0"
                >
                  <StageMark stage={item.stage} className="stage-mark-sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-display text-[21px] leading-7 text-white">{item.title}</span>
                      <ArrowDown
                        aria-hidden="true"
                        className="mt-1 h-4 w-4 shrink-0 text-smu-gold-light transition-transform group-hover:translate-y-0.5"
                      />
                    </span>
                    <span className="mt-1 block text-[14.5px] leading-[22px] text-white/85">{item.text}</span>
                    <span className="mt-2 block min-h-[20px] text-[13px] font-semibold leading-5 text-smu-gold-light">
                      {item.live}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>

          <p
            role="status"
            className="flex min-h-[44px] items-center gap-2 border-t border-white/15 py-3 text-[13px] leading-5 text-white/85"
          >
            {error && !hasData ? (
              "Live data is unavailable right now."
            ) : latest && now > 0 ? (
              <>
                <LiveDot />
                <span>
                  Latest reading:{" "}
                  <span className="font-semibold tabular-nums text-white">+{weight(latest.kg)}</span>
                  {latest.pantry ? ` from ${latest.pantry}` : ""}, {ago(latest.at, now)}
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </section>
  );
}
