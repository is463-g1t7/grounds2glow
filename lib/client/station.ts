"use client";

import { useSyncExternalStore } from "react";
import { demoControlsEnabled } from "@/lib/demo-controls";
import type { ScaleUnit } from "@/lib/scale-reading";

/**
 * Each central bin has its own laptop. A laptop is set up once by opening any cleaner page with
 * `?station=<bin id>` (or `?station=none` to clear it), and remembers it in this browser.
 * `?scale=g` says its scale shows grams (`?scale=kg` goes back to kilograms).
 * `?demo=1` / `?demo=0` turns demo mode on or off for assessors: demo passes, simulated
 * failures and the OCR pipeline readout.
 */
const STATION_KEY = "smu-cleaner-station";
const DEMO_KEY = "smu-cleaner-demo";
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

export function useDemoMode(): boolean {
  const stored = useSyncExternalStore(subscribe, () => read(DEMO_KEY), () => null);
  return stored === "1" || (stored == null && demoControlsEnabled);
}

export function setDemoMode(on: boolean) {
  write(DEMO_KEY, on ? "1" : "0");
}

/** The unit this station's scale shows. kg unless the laptop was set up with `?scale=g`. */
export function useScaleUnit(): ScaleUnit {
  const stored = useSyncExternalStore(subscribe, () => read(SCALE_KEY), () => null);
  return stored === "g" ? "g" : "kg";
}

/** Applies `?station=`, `?scale=` and `?demo=` from the address bar. */
export function applyStationParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("scale")) write(SCALE_KEY, params.get("scale") === "g" ? "g" : null);
  if (params.has("station")) {
    const value = params.get("station");
    setStation(value && value !== "none" ? value : null);
  }
  if (params.has("demo")) setDemoMode(params.get("demo") === "1");
}
