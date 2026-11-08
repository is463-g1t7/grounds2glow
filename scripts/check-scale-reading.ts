/**
 * Checks how scale displays are read: kg and gram scales, lost decimal points, and the grams
 * fallback. Run with `bun scripts/check-scale-reading.ts`; it exits non-zero on a failure.
 */
import { parseScaleReading, type ScaleUnit } from "../lib/scale-reading";
import type { OcrLine } from "../lib/languages";

/** An OCR line with a box of the given height, placed at (x, y). */
function line(text: string, height: number, x = 0, y = 0): OcrLine {
  return {
    text,
    box: [
      [x, y],
      [x + 100, y],
      [x + 100, y + height],
      [x, y + height],
    ],
  };
}

type Case = {
  name: string;
  lines: OcrLine[];
  stationUnit?: ScaleUnit;
  capacityKg?: number;
  expect: { value: number; unit: ScaleUnit; kg: number; unitFrom: string } | null;
};

const CASES: Case[] = [
  { name: "kg with unit", lines: [line("4.2 kg", 40)], expect: { value: 4.2, unit: "kg", kg: 4.2, unitFrom: "photo" } },
  { name: "kg, lost decimal point", lines: [line("42", 40), line("kg", 10, 120, 20)], expect: { value: 4.2, unit: "kg", kg: 4.2, unitFrom: "photo" } },
  { name: "kg, comma decimal", lines: [line("0,85kg", 40)], expect: { value: 0.85, unit: "kg", kg: 0.85, unitFrom: "photo" } },
  { name: "grams with unit", lines: [line("850 g", 40)], expect: { value: 850, unit: "g", kg: 0.85, unitFrom: "photo" } },
  { name: "grams, unit on its own line", lines: [line("850", 40), line("g", 12, 110, 20)], expect: { value: 850, unit: "g", kg: 0.85, unitFrom: "photo" } },
  { name: "grams, thousands comma", lines: [line("1,250 g", 40)], expect: { value: 1250, unit: "g", kg: 1.25, unitFrom: "photo" } },
  { name: "grams, kept to the gram", lines: [line("125g", 40)], expect: { value: 125, unit: "g", kg: 0.125, unitFrom: "photo" } },
  { name: "real scale: 0.129, kg station, 2 kg bin", lines: [line("0.129", 40)], stationUnit: "kg", capacityKg: 2, expect: { value: 0.129, unit: "kg", kg: 0.129, unitFrom: "station" } },
  { name: "real scale: 0.129 on a grams station", lines: [line("0.129", 40)], stationUnit: "g", capacityKg: 2, expect: { value: 0.129, unit: "kg", kg: 0.129, unitFrom: "station" } },
  { name: "real scale: kg icon misread as g", lines: [line("0.129", 40), line("g", 8, 0, 0)], stationUnit: "g", capacityKg: 2, expect: { value: 0.129, unit: "kg", kg: 0.129, unitFrom: "photo" } },
  { name: "real scale: decimal point lost, grams station", lines: [line("0129", 40)], stationUnit: "g", capacityKg: 2, expect: { value: 129, unit: "g", kg: 0.129, unitFrom: "station" } },
  { name: "real scale: decimal point lost, kg station", lines: [line("0129", 40)], stationUnit: "kg", capacityKg: 2, expect: { value: 129, unit: "g", kg: 0.129, unitFrom: "guess" } },
  { name: "1.250 on a grams station is kg", lines: [line("1.250", 40)], stationUnit: "g", capacityKg: 2, expect: { value: 1.25, unit: "kg", kg: 1.25, unitFrom: "station" } },
  { name: "no unit, station set to grams", lines: [line("850", 40)], stationUnit: "g", expect: { value: 850, unit: "g", kg: 0.85, unitFrom: "station" } },
  { name: "no unit, station kg, digits fit as kg", lines: [line("42", 40)], stationUnit: "kg", expect: { value: 4.2, unit: "kg", kg: 4.2, unitFrom: "station" } },
  { name: "no unit, too heavy as kg, so grams", lines: [line("850", 40)], stationUnit: "kg", expect: { value: 850, unit: "g", kg: 0.85, unitFrom: "guess" } },
  { name: "no unit, no station, too heavy as kg", lines: [line("2500", 40)], expect: { value: 2500, unit: "g", kg: 2.5, unitFrom: "guess" } },
  { name: "zero on the display", lines: [line("0 g", 40)], expect: { value: 0, unit: "g", kg: 0, unitFrom: "photo" } },
  { name: "tallest number wins", lines: [line("MAX 5kg", 10, 0, 100), line("1.75", 40), line("kg", 10, 110, 10)], expect: { value: 1.75, unit: "kg", kg: 1.75, unitFrom: "photo" } },
  { name: "no number at all", lines: [line("TARE", 40)], expect: null },
];

let failed = 0;
for (const c of CASES) {
  const got = parseScaleReading(c.lines, { stationUnit: c.stationUnit, capacityKg: c.capacityKg ?? 10 });
  const ok = JSON.stringify(got) === JSON.stringify(c.expect);
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${c.name}${ok ? "" : `\n      expected ${JSON.stringify(c.expect)}\n      got      ${JSON.stringify(got)}`}`);
}
console.log(failed ? `\n${failed} of ${CASES.length} failed` : `\nAll ${CASES.length} passed`);
if (failed) process.exit(1);
