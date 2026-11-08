import type { OcrLine } from "./languages";

export type ScaleUnit = "kg" | "g";

export type ScaleReading = {
  /** The number as the display shows it, in `unit`. */
  value: number;
  unit: ScaleUnit;
  /** The same weight in kg, to the gram. */
  kg: number;
  /**
   * Where the unit came from: printed on the display, the station's scale setting, or a guess
   * (no unit anywhere, or a kg reading too heavy for the bin, so it was read as grams).
   */
  unitFrom: "photo" | "station" | "guess";
};

function boxHeight(line: OcrLine): number {
  const ys = line.box.map(([, y]) => y);
  return ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
}

function boxCentre(line: OcrLine): [number, number] {
  const n = line.box.length || 1;
  return [
    line.box.reduce((sum, [x]) => sum + x, 0) / n,
    line.box.reduce((sum, [, y]) => sum + y, 0) / n,
  ];
}

/** The unit printed in a piece of OCR text, if any. "kg" wins over a lone "g". */
export function unitIn(text: string): ScaleUnit | null {
  if (/k\s?g/i.test(text)) return "kg";
  if (/(^|[^a-z])g($|[^a-z])/i.test(text)) return "g";
  return null;
}

/** Turns digits read off the display into a number in `unit`, or null if they aren't a number. */
export function toValue(digits: string, unit: ScaleUnit): number | null {
  let s = digits;
  // Grams can carry a thousands separator ("1,250"); anywhere else a comma is a decimal point.
  if (unit === "g" && /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else s = s.replace(/,/g, ".");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  // A kg display shows one decimal place, so a lost decimal point ("42") reads as 4.2.
  if (unit === "kg" && !s.includes(".") && s.length > 1) return n / 10;
  return n;
}

export function toKg(value: number, unit: ScaleUnit): number {
  return Math.round((unit === "g" ? value : value * 1000)) / 1000;
}

/**
 * Finds the weight in OCR lines read from a scale display.
 * The display's digits are the largest text in the photo, so the tallest number wins.
 * Its unit comes from the display when OCR read one, otherwise from the station's setting.
 * With neither, it's read as kg, unless that would be more than the bin holds: then it's grams.
 */
export function parseScaleReading(
  lines: OcrLine[],
  { stationUnit = null, capacityKg }: { stationUnit?: ScaleUnit | null; capacityKg?: number } = {},
): ScaleReading | null {
  let best: { digits: string; line: OcrLine; height: number } | null = null;
  for (const line of lines) {
    const height = boxHeight(line);
    for (const match of line.text.matchAll(/\d[\d.,]*/g)) {
      const digits = match[0].replace(/[.,]+$/, "");
      if (digits && (!best || height > best.height)) best = { digits, line, height };
    }
  }
  if (!best) return null;

  // The unit next to the number, or failing that the nearest unit printed anywhere on the display.
  let photoUnit = unitIn(best.line.text);
  if (!photoUnit) {
    const [bx, by] = boxCentre(best.line);
    let nearest = Infinity;
    for (const line of lines) {
      const unit = unitIn(line.text);
      if (!unit || line === best.line) continue;
      const [x, y] = boxCentre(line);
      const distance = Math.hypot(x - bx, y - by);
      if (distance < nearest) {
        nearest = distance;
        photoUnit = unit;
      }
    }
  }

  let unit: ScaleUnit = photoUnit ?? stationUnit ?? "kg";
  let unitFrom: ScaleReading["unitFrom"] = photoUnit ? "photo" : stationUnit ? "station" : "guess";
  // A gram scale doesn't show three decimals: "0.129" is a kg display, whatever else was read.
  // Only a real decimal point counts, since "1,250" is 1,250 g with a thousands separator.
  if (unit === "g" && /^\d+\.\d{3}$/.test(best.digits)) unit = "kg";

  let value = toValue(best.digits, unit);
  if (value == null) return null;

  // No unit on the display, and as kg it couldn't fit in the bin: the scale is showing grams.
  if (unitFrom !== "photo" && unit === "kg" && capacityKg != null && value > capacityKg) {
    const grams = toValue(best.digits, "g");
    if (grams != null && grams / 1000 <= capacityKg) {
      unit = "g";
      value = grams;
      unitFrom = "guess";
    }
  }

  return { value, unit, kg: toKg(value, unit), unitFrom };
}
