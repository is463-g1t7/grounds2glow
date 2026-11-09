"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BootstrapData } from "@/lib/types";

const EMPTY: BootstrapData = {
  bins: [],
  events: [],
  cleaners: [],
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

type RefreshOptions = {
  /** Skip the Upstash snapshot and read Postgres directly. */
  bypassCache?: boolean;
};

export function useBootstrap(pollMs = 0) {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const mounted = useRef(true);

  const replaceData = useCallback((next: BootstrapData) => {
    setData(next);
    setUpdatedAt(next.updatedAt ?? new Date().toISOString());
  }, []);

  const refresh = useCallback(
    async (options?: RefreshOptions) => {
      const url = options?.bypassCache ? "/api/bootstrap?refresh=1" : "/api/bootstrap";
      try {
        const next = await apiRequest<BootstrapData>(url);
        if (mounted.current) {
          replaceData(next);
          setError(null);
        }
        return next;
      } catch (err) {
        if (mounted.current) setError(err instanceof Error ? err.message : "Unable to load data.");
        return null;
      }
    },
    [replaceData],
  );

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

  return {
    data: data ?? EMPTY,
    loading: data === null,
    error,
    refresh,
    setData: replaceData,
    updatedAt,
  };
}
