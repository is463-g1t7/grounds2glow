"use client";

import { ExternalLink, Link2 } from "lucide-react";
import type { Source } from "@/lib/ai";

/** Based on shadcn/ui AI Elements Sources: https://ui.shadcn.com/docs/ai-elements/base/sources */
export function Sources({ sources }: { sources: Source[] }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white/70">
      <div className="flex items-center gap-2 border-b border-black/8 px-3 py-2 text-[11px] font-semibold uppercase tracking-[1.2px] text-smu-muted">
        <Link2 className="h-3.5 w-3.5 text-smu-gold" />
        Sources
      </div>
      <ul className="divide-y divide-black/5">
        {sources.map((source) => (
          <li key={source.title}>
            <a
              href={source.url}
              className="group flex items-start justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-smu-cream/40"
            >
              <span>
                <span className="block text-[12.5px] font-semibold text-smu-navy">
                  {source.title}
                </span>
                <span className="block text-[11px] leading-4 text-smu-muted">{source.note}</span>
              </span>
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-black/30 transition-colors group-hover:text-smu-gold" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
