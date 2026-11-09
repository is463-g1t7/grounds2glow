import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ago } from "@/lib/analytics";
import { statusFor } from "@/lib/bins";
import { weight } from "@/lib/format";
import type { Bin, BinEvent, BinStatus, Cleaner } from "@/lib/types";
import { cn } from "@/lib/utils";
import { latestDeposit, LiveDot, StageMark } from "./shared";

const statusStyle: Record<BinStatus, { bar: string; label: string; text: string }> = {
  ok: { bar: "bg-smu-gold", label: "OK", text: "text-smu-muted" },
  near: { bar: "bg-smu-warning", label: "Near full", text: "text-[#7a5606]" },
  full: { bar: "bg-smu-danger", label: "Full", text: "text-smu-danger" },
};

function describeEvent(event: BinEvent, bins: Bin[], cleaners: Cleaner[]) {
  const bin = bins.find((item) => item.id === event.binId);
  if (event.type === "collect") return `Collected from ${bin?.short ?? "a bin"}`;
  const who = cleaners.find((cleaner) => cleaner.id === event.cleanerId)?.name;
  const where = event.pantry ?? bin?.short ?? "a pantry";
  return who ? `${who} · ${where}` : where;
}

/**
 * The newest reading when the page loaded is the baseline. A deposit that arrives after it
 * came from this visit, so the demo's result shows up right where the bins update.
 */
function ReadingStatus({ events }: { events: BinEvent[] }) {
  const latest = latestDeposit(events);
  const [baselineId, setBaselineId] = useState<string | null>(null);

  if (latest && baselineId === null) setBaselineId(latest.id);
  const arrived = latest && baselineId !== null && latest.id !== baselineId ? latest : null;

  return (
    <div
      role="status"
      className={cn(
        "mt-4 flex min-h-[60px] items-center rounded-[3px] border px-4 py-3 transition-colors duration-500",
        arrived ? "border-smu-success bg-[#eef7ea]" : "border-black/10 bg-smu-cream-light"
      )}
    >
      {arrived ? (
        <p key={arrived.id} className="fade-up flex items-center gap-3 text-[14px] leading-5 text-black">
          <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-[#287a28]" />
          <span>
            <span className="font-semibold text-[#287a28]">New reading received</span>
            <span className="block tabular-nums">
              +{weight(arrived.kg)}{arrived.pantry ? ` from ${arrived.pantry}` : ""}
            </span>
          </span>
        </p>
      ) : (
        <p className="flex items-center gap-3 text-[14px] leading-5 text-black/80">
          <LiveDot />
          Waiting for your reading from the pantry app
        </p>
      )}
    </div>
  );
}

export function DashboardSection({
  bins,
  events,
  cleaners,
  loading,
  error,
  now,
}: {
  bins: Bin[];
  events: BinEvent[];
  cleaners: Cleaner[];
  loading: boolean;
  error: string | null;
  now: number;
}) {
  const recent = events.slice(0, 3);

  return (
    <section id="dashboard" className="section-pad section-slant relative z-20 scroll-mt-[100px] overflow-hidden bg-smu-navy text-white md:py-24">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 hidden w-[52%] bg-white/[0.035] [clip-path:polygon(22%_0,100%_0,100%_100%,0_100%)] lg:block"
      />
      <div className="container-smu relative grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-14">
        <div className="lg:col-span-5">
          <StageMark stage={2} />
          <h2 className="display-h2 mt-5 text-white">The scale reads itself. The dashboard keeps up.</h2>
          <p className="mt-4 max-w-[60ch] text-[18px] leading-7 text-white">
            Smart bin OCR reads the weight off the scale display and posts it to the dashboard,
            so operations can see which bins need collecting.
          </p>


          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/dashboard" className="cta cta-gold">
              Open the live dashboard
            </Link>
            <Link
              href="/scan"
              className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-white transition-colors hover:text-smu-gold-light"
            >
              Try the scale scanner <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="flex flex-col rounded-[4px] border-t-4 border-smu-gold bg-white p-5 text-black shadow-lift md:p-7 lg:col-span-7">
          <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-4">
            <h3 className="font-display text-[24px] leading-8 text-smu-navy">Live from the bins</h3>
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#287a28]">
              <LiveDot /> Live
            </span>
          </div>

          {bins.length > 0 && <ReadingStatus events={events} />}

          {loading && !error && (
            <div aria-hidden="true" className="mt-5 space-y-4">
              {Array.from({ length: 7 }, (_, index) => (
                <div key={index} className="h-8 animate-pulse rounded-[3px] bg-smu-cream-light" />
              ))}
            </div>
          )}

          {!loading && bins.length === 0 && (
            <p className="py-10 text-center text-[15px] text-smu-muted">No bin data yet.</p>
          )}

          {error && bins.length === 0 && (
            <p className="py-10 text-center text-[15px] text-smu-muted">
              Live data is unavailable right now.
            </p>
          )}

          {bins.length > 0 && (
            <>
              <ul className="mt-2 flex flex-1 flex-col justify-around">
                {bins.map((bin) => {
                  const status = statusFor(bin.weightKg, bin.capacityKg);
                  const style = statusStyle[status];
                  const percent = Math.min(100, (bin.weightKg / bin.capacityKg) * 100);
                  return (
                    <li key={bin.id} className="grid grid-cols-[64px_1fr_auto] items-center gap-3 py-2.5">
                      <span className="text-[14px] font-semibold text-smu-navy">{bin.short}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-smu-cream-light">
                        <span
                          className={cn("block h-full rounded-full transition-[width] duration-700 ease-out", style.bar)}
                          style={{ width: `${percent}%` }}
                        />
                      </span>
                      <span className="w-[176px] text-right text-[13px] tabular-nums">
                        <span className="font-semibold">{weight(bin.weightKg)}</span>
                        <span className="text-smu-muted"> / {weight(bin.capacityKg)}</span>
                        <span className={cn("ml-2 inline-block w-[54px] text-left text-[11.5px] font-semibold", style.text)}>
                          {style.label}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>

              <h4 className="mt-5 border-t border-black/10 pt-4 text-[13px] font-semibold text-smu-muted">
                Latest activity
              </h4>
              <ul className="mt-2 space-y-2">
                {recent.map((event) => (
                  <li key={event.id} className="flex items-baseline justify-between gap-3 text-[13.5px] leading-5">
                    <span className="min-w-0 truncate">{describeEvent(event, bins, cleaners)}</span>
                    <span className="shrink-0 tabular-nums text-smu-muted">
                      {event.type === "deposit" ? "+" : "−"}
                      {weight(event.kg)}{now > 0 ? ` · ${ago(event.at, now)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
