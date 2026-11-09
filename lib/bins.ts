import type { BinStatus } from "./types";

export const BIN_CAPACITY_KG = 2;

/** Every collection is repurposed by a student volunteer for now; individual names come later. */
export const COLLECTOR_LABEL = "Student Volunteer";

export function collectorOf(event: { collectedBy?: string | null }): string {
  return event.collectedBy ?? COLLECTOR_LABEL;
}
const NEAR_FULL_RATIO = 0.8;

export function levelsFor(bin: { levels: number }): number {
  return bin.levels;
}

export function pantryLabel(bin: { short: string }, level: number): string {
  return `${bin.short} · L${level}`;
}

export function statusFor(weightKg: number, capacityKg = BIN_CAPACITY_KG): BinStatus {
  if (weightKg >= capacityKg) return "full";
  if (weightKg >= capacityKg * NEAR_FULL_RATIO) return "near";
  return "ok";
}
