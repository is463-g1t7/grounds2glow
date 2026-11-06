import Image from "next/image";
import { SCALE_LCD, type ScaleFrame } from "@/lib/scales";
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

/** An overhead scale photo with the OCR lock drawn around its display. */
export function ScaleReadout({
  frame,
  sizes,
  eager = false,
  className,
  imageClassName,
}: {
  frame: ScaleFrame;
  sizes: string;
  eager?: boolean;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div className={cn("relative aspect-[2752/1536] w-full", className)}>
      <Image
        src={frame.src}
        alt={`Overhead view of a tub of used coffee grounds on a floor scale reading ${frame.refKg} kg`}
        fill
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        className={cn("object-cover", imageClassName)}
      />
      <span
        aria-hidden="true"
        className="ocr-lock absolute rounded-[3px] border-2 border-smu-success"
        style={{
          left: `${SCALE_LCD.x * 100}%`,
          top: `${SCALE_LCD.y * 100}%`,
          width: `${SCALE_LCD.w * 100}%`,
          height: `${SCALE_LCD.h * 100}%`,
        }}
      />
      <span
        className="ocr-tag absolute whitespace-nowrap rounded-[3px] bg-smu-navy-deep px-2 py-1 text-[12px] font-semibold tabular-nums text-white"
        style={{
          left: `${(SCALE_LCD.x + SCALE_LCD.w) * 100 + 1.5}%`,
          top: `${SCALE_LCD.y * 100}%`,
        }}
      >
        OCR · {frame.refKg.toFixed(2)} kg
      </span>
    </div>
  );
}
