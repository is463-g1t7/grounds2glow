import type { OcrLine } from "./languages";

function boxHeight(line: OcrLine): number {
  const ys = line.box.map(([, y]) => y);
  return ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
}

/**
 * Finds the weight in OCR lines read from a scale display, in kg.
 * The display's digits are the largest text in the photo, so the tallest number wins.
 * The scale shows one decimal place, so a lost decimal point ("42") reads as 4.2.
 */
export function parseScaleKg(lines: OcrLine[]): number | null {
  let best: { kg: number; height: number } | null = null;
  for (const line of lines) {
    const height = boxHeight(line);
    for (const match of line.text.replace(/,/g, ".").matchAll(/\d+(?:\.\d+)?/g)) {
      const digits = match[0];
      const kg = digits.includes(".")
        ? Number(digits)
        : digits.length > 1
          ? Number(digits) / 10
          : Number(digits);
      if (Number.isFinite(kg) && (!best || height > best.height)) best = { kg, height };
    }
  }
  return best ? Math.round(best.kg * 100) / 100 : null;
}
