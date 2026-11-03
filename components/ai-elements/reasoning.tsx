"use client";

import { useState } from "react";
import { Brain, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Based on shadcn/ui AI Elements Reasoning: https://ui.shadcn.com/docs/ai-elements/base/reasoning */
export function Reasoning({
  steps,
  title = "Thought for a few seconds",
}: {
  steps: string[];
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-black/10 bg-white/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium text-smu-muted transition-colors hover:text-smu-navy"
      >
        <Brain className="h-3.5 w-3.5 text-smu-gold" />
        {title}
        <ChevronDown
          className={cn("ml-auto h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <ol className="space-y-2 border-t border-black/8 px-3 py-3 text-[12.5px] leading-5 text-smu-muted">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-2.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-smu-gold/15 text-[10px] font-semibold text-smu-gold">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
