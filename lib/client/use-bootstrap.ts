"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BootstrapData } from "@/lib/types";

const EMPTY: BootstrapData = {
  bins: [],
  events: [],
  cleaners: [],
  news: [],
  programmeEvents: [],
  metrics: [],
};

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
  return data;
}

export function useBootstrap(pollMs = 0) {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const next = await apiRequest<BootstrapData>("/api/bootstrap");
      if (mounted.current) {
        setData(next);
        setError(null);
      }
      return next;
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "Unable to load data.");
      return null;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    if (!pollMs) return () => { mounted.current = false; };
    const timer = window.setInterval(() => void refresh(), pollMs);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, [pollMs, refresh]);

  return { data: data ?? EMPTY, loading: data === null, error, refresh, setData };
}
