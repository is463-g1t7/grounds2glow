"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PlanStep = {
  label: string;
  detail?: string;
  status: "done" | "active" | "pending";
};

/** Based on shadcn/ui AI Elements Plan: https://ui.shadcn.com/docs/ai-elements/base/plan */
export function Plan({ steps, title = "Plan" }: { steps: PlanStep[]; title?: string }) {
  const done = steps.filter((step) => step.status === "done").length;
  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
      <div className="flex items-center gap-2 border-b border-black/8 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-smu-muted">
          {title}
        </span>
        <span className="ml-auto text-[11px] text-black/40">
          {done} of {steps.length} done
        </span>
      </div>
      <ol className="divide-y divide-black/5">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-2.5 px-3 py-2.5">
            {step.status === "done" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-smu-success" />
            ) : step.status === "active" ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-smu-gold" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-black/20" />
            )}
            <div>
              <p
                className={cn(
                  "text-[12.5px] font-medium leading-5",
                  step.status === "pending" ? "text-smu-muted" : "text-smu-navy"
                )}
              >
                {step.label}
              </p>
              {step.detail && <p className="text-[11px] leading-4 text-smu-muted">{step.detail}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
