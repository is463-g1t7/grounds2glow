"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const id = window.setInterval(callback, 30_000);
  return () => window.clearInterval(id);
}

const nowMinute = () => Math.floor(Date.now() / 60_000) * 60_000;

export function useNow() {
  return useSyncExternalStore(subscribe, nowMinute, () => 0);
}
