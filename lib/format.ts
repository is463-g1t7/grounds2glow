/** Kilograms for charts and labels: whole numbers stay whole, the rest get one decimal. */
export function kg(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} kg`;
}
