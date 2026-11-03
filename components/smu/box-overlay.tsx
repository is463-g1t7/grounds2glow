"use client";

import type { OcrLine } from "@/lib/languages";

export function BoxOverlay({
  src,
  lines,
  size,
  activeIndex,
  onActiveChange,
  onLoad,
}: {
  src: string;
  lines: OcrLine[];
  size: { width: number; height: number } | null;
  activeIndex: number | null;
  onActiveChange: (index: number | null) => void;
  onLoad: (size: { width: number; height: number }) => void;
}) {
  return (
    <div className="relative w-full overflow-hidden rounded border border-black/10">
      <img
        src={src}
        alt="Uploaded image"
        className="block h-auto w-full"
        onLoad={(e) => onLoad({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
      />
      {size && lines.length > 0 && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${size.width} ${size.height}`}
          preserveAspectRatio="none"
        >
          {lines.map((line, i) => (
            <polygon
              key={i}
              points={line.box.map(([x, y]) => `${x},${y}`).join(" ")}
              vectorEffect="non-scaling-stroke"
              className={
                i === activeIndex
                  ? "fill-smu-gold/35 stroke-smu-gold-dark stroke-[3px]"
                  : "fill-smu-navy/10 stroke-smu-navy/70 stroke-[1.5px]"
              }
              onMouseEnter={() => onActiveChange(i)}
              onMouseLeave={() => onActiveChange(null)}
            >
              <title>{line.text}</title>
            </polygon>
          ))}
        </svg>
      )}
    </div>
  );
}
