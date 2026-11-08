/** A weight for people to read: grams under 1 kg ("129 g"), kilograms from there ("1.25 kg"). */
export function weight(v: number): string {
  const grams = Math.round(v * 1000);
  if (Math.abs(grams) < 1000) return `${grams} g`;
  const kilos = grams / 1000;
  return `${Number(kilos.toFixed(Math.abs(kilos) >= 10 ? 1 : 2))} kg`;
}

/** Weights for charts and labels. */
export const kg = weight;
