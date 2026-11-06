/**
 * Preloaded overhead frames of the central-bin floor scale. `refKg` is what the LCD shows —
 * used to pick a frame heavier than the bin's current total, and as a labelled fallback.
 */
export const SCALE_FRAMES = [
  { src: "/images/weighing_scale_1.jpeg", refKg: 4.2 },
  { src: "/images/weighing_scale_2.jpeg", refKg: 5.7 },
  { src: "/images/weighing_scale_3.jpeg", refKg: 8.3 },
] as const;

export type ScaleFrame = (typeof SCALE_FRAMES)[number];

/** LCD window within the overhead frames (fractions of width/height). */
export const SCALE_LCD = { x: 0.425, y: 0.12, w: 0.15, h: 0.12 };

/** Random frame whose reading is above the bin's current total; null if none is. */
export function pickFrame(currentKg: number, exclude?: string): ScaleFrame | null {
  const ok = SCALE_FRAMES.filter((f) => f.refKg > currentKg + 0.05 && f.src !== exclude);
  const pool = ok.length ? ok : SCALE_FRAMES.filter((f) => f.refKg > currentKg + 0.05);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
