/** Part of a photo, as fractions of its width and height. */
export type LcdRect = { x: number; y: number; w: number; h: number };

/**
 * Overhead illustrations of a floor scale for the landing page. `refKg` is what the LCD shows.
 * They show a full-size bin, so they aren't used as photos to weigh.
 */
export const SCALE_FRAMES = [
  { src: "/images/weighing_scale_1.jpeg", refKg: 4.2 },
  { src: "/images/weighing_scale_2.jpeg", refKg: 5.7 },
  { src: "/images/weighing_scale_3.jpeg", refKg: 8.3 },
] as const;

export type ScaleFrame = (typeof SCALE_FRAMES)[number];

/** LCD window within the landing page's illustrations (fractions of width/height). */
export const SCALE_LCD: LcdRect = { x: 0.425, y: 0.12, w: 0.15, h: 0.12 };

/**
 * Sample photos of the prototype's real scale, for the weigh step. `refKg` is what the LCD shows
 * (the labelled fallback if OCR can't read it) and `lcd` is where the display is in the photo.
 * Add more photos at heavier readings so bins that already hold grounds have one to use.
 */
export const SAMPLE_FRAMES: Array<{ src: string; refKg: number; lcd: LcdRect }> = [
  { src: "/images/scale.jpg", refKg: 0.129, lcd: { x: 0.404, y: 0.537, w: 0.19, h: 0.065 } },
];

export type SampleFrame = (typeof SAMPLE_FRAMES)[number];

/** Random sample photo whose reading is above the bin's current total; null if none is. */
export function pickFrame(currentKg: number, exclude?: string): SampleFrame | null {
  const heavier = SAMPLE_FRAMES.filter((f) => f.refKg > currentKg);
  const pool = heavier.filter((f) => f.src !== exclude);
  const from = pool.length ? pool : heavier;
  return from.length ? from[Math.floor(Math.random() * from.length)] : null;
}
