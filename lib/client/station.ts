"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { ScaleUnit } from "@/lib/scale-reading";

/**
 * Each central bin has its own laptop. A laptop is set up once by opening any cleaner page with
 * `?station=<bin id>` (or `?station=none` to clear it), and remembers it in this browser.
 * `?scale=g` says its scale shows grams (`?scale=kg` goes back to kilograms).
 *
 * Live vs demo is NOT a setting. It is decided by the URL: `/cleaner/*` is the live station
 * (real OCR, real photos, nothing simulated) and `/demo/cleaner/*` is the demo station (sample
 * scale photo). Nothing is stored, so a laptop can never get stuck
 * in the wrong mode.
 */
const STATION_KEY = "smu-cleaner-station";
const SCALE_KEY = "smu-cleaner-scale";

const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the setting lasts until the page reloads.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** The bin this laptop is set up for, or null. */
export function useStation(): string | null {
  return useSyncExternalStore(subscribe, () => read(STATION_KEY), () => null);
}

export function setStation(binId: string | null) {
  write(STATION_KEY, binId);
}

export const LIVE_BASE = "/cleaner";
export const DEMO_BASE = "/demo/cleaner";

/** Which station this page belongs to, and the path prefix its links should use. */
export function useStationMode(): { demo: boolean; base: string } {
  const pathname = usePathname() ?? "";
  const demo = pathname === DEMO_BASE || pathname.startsWith(`${DEMO_BASE}/`);
  return { demo, base: demo ? DEMO_BASE : LIVE_BASE };
}

/** The unit this station's scale shows. kg unless the laptop was set up with `?scale=g`. */
export function useScaleUnit(): ScaleUnit {
  const stored = useSyncExternalStore(subscribe, () => read(SCALE_KEY), () => null);
  return stored === "g" ? "g" : "kg";
}

/** Applies `?station=` and `?scale=` from the address bar. */
export function applyStationParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("scale")) write(SCALE_KEY, params.get("scale") === "g" ? "g" : null);
  if (params.has("station")) {
    const value = params.get("station");
    setStation(value && value !== "none" ? value : null);
  }
}
