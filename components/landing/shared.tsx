import type { BinEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Events arrive newest first. */
export function latestDeposit(events: BinEvent[]) {
  return events.find((event) => event.type === "deposit") ?? null;
}

/** Marks a stage of the loop, in the angled plane the site header uses. */
export function StageMark({ stage, className }: { stage: 1 | 2 | 3; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("stage-mark", className)}>
      {stage}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("relative flex h-2 w-2 shrink-0", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-smu-success opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-smu-success" />
    </span>
  );
}
