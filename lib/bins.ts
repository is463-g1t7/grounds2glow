import type { BinStatus } from "./types";

export const BIN_CAPACITY_KG = 10;
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

export function parseKgFromOcrText(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*kg/i) ?? text.match(/(\d+\.\d+|\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (Number.isNaN(n)) return null;
  return Math.min(BIN_CAPACITY_KG, Math.max(0, n));
}
