import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatKg = (n: number, digits = 1) =>
  `${n.toLocaleString("en-SG", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} kg`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
