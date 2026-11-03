"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

/** Based on shadcn/ui AI Elements Tool: https://ui.shadcn.com/docs/ai-elements/base/tool */
export function Tool({
  name,
  input,
  output,
}: {
  name: string;
  input: string;
  output: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-smu-cream/40"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-smu-navy/5 text-smu-navy">
          <Wrench className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[12px] font-semibold text-smu-navy">
            {name}
          </span>
          <span className="block text-[11px] text-smu-muted">Tool call</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] font-medium text-smu-success">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-black/35 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="grid gap-2 border-t border-black/8 bg-smu-cream/30 px-3 py-3 md:grid-cols-2">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[1px] text-black/40">
              Input
            </p>
            <pre className="overflow-x-auto rounded bg-white p-2 font-mono text-[11px] leading-5 text-smu-muted">
              {input}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[1px] text-black/40">
              Output
            </p>
            <pre className="overflow-x-auto rounded bg-white p-2 font-mono text-[11px] leading-5 text-smu-muted">
              {output}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
