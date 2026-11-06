import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useQr } from "@/lib/client/use-qr";
import type { BinEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { latestDeposit, LiveDot } from "./shared";

const steps = [
  ["Keep this page open", "It checks for new readings every few seconds."],
  ["Open the pantry staff app on your phone", "Scan the code or use the button, then tap a staff pass, pick a pantry and weigh the bin."],
  ["Watch your reading land here", "The “Waiting for your reading” panel changes as soon as it arrives."],
  ["Ask the kiosk guide a question", "Finish the loop with the AI guide further up this page."],
];

export function DemoRouteSection({ events }: { events: BinEvent[] }) {
  const qr = useQr("/cleaner");
  const latest = latestDeposit(events);
  const [baselineId, setBaselineId] = useState<string | null>(null);

  // The newest reading at first load is the baseline; anything after it arrived during this visit.
  if (latest && baselineId === null) setBaselineId(latest.id);
  const arrived = latest && baselineId !== null && latest.id !== baselineId ? latest : null;

  return (
    <section id="try" className="section-pad scroll-mt-[100px] bg-smu-navy-deep text-white">
      <div className="container-smu grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <h2 className="display-h2 text-white">Try the whole loop in three minutes</h2>
          <ol className="mt-8 border-t border-white/20">
            {steps.map(([title, text], index) => (
              <li key={title} className="flex gap-5 border-b border-white/20 py-4">
                <span
                  aria-hidden="true"
                  className="w-6 shrink-0 font-display text-[24px] leading-7 text-smu-gold-light"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-[17px] font-semibold leading-7 text-white">{title}</h3>
                  <p className="text-[15px] leading-6 text-white/85">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-5">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start lg:flex-col lg:items-stretch xl:flex-row">
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt="QR code that opens the pantry staff app on a phone"
                className="hidden h-[176px] w-[176px] shrink-0 rounded-[4px] sm:block"
              />
            )}
            <div
              role="status"
              className={cn(
                "flex min-h-[176px] w-full flex-1 items-center rounded-[4px] border p-5 transition-colors duration-500",
                arrived ? "border-smu-success bg-[#eef7ea] text-black" : "border-white/25 text-white"
              )}
            >
              {arrived ? (
                <div key={arrived.id} className="fade-up">
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-[#287a28]">
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> New reading received
                  </p>
                  <p className="mt-2 font-display text-[34px] leading-10 tabular-nums text-[#287a28]">
                    +{arrived.kg.toFixed(2)} kg
                  </p>
                  {arrived.pantry && <p className="text-[14px] leading-5">from {arrived.pantry}</p>}
                </div>
              ) : (
                <p className="flex items-center gap-3 text-[15px] leading-6">
                  <LiveDot />
                  Waiting for your reading
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/cleaner" className="cta cta-gold">
              Open the pantry staff app
            </Link>
            <Link href="/dashboard" className="cta cta-outline-light">
              See it on the dashboard
            </Link>
          </div>
          <p className="mt-6 text-[13px] leading-5 text-white/80">
            A student-built prototype for the SMU Circular Coffee programme.
          </p>
        </div>
      </div>
    </section>
  );
}
