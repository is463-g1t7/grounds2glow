"use client";

import { useSyncExternalStore } from "react";
import {
  SESSION_HEADER,
  type CaptureJob,
  type CaptureRequest,
  type CaptureResult,
  type PairStatus,
} from "@/lib/capture-types";

/**
 * The capture session each device keeps after pairing (see lib/capture-types.ts). The laptop and
 * the phone use different keys, so both can run in one browser while testing.
 */
export type CaptureRole = "laptop" | "phone";

const KEYS: Record<CaptureRole, string> = {
  laptop: "smu-capture-laptop-session",
  phone: "smu-capture-phone-session",
};

const listeners = new Set<() => void>();

function read(role: CaptureRole): string | null {
  try {
    return window.localStorage.getItem(KEYS[role]);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** This device's capture session, or null when it isn't paired. Undefined until it's known. */
export function useCaptureSession(role: CaptureRole): string | null | undefined {
  return useSyncExternalStore(subscribe, () => read(role), () => undefined);
}

export function setCaptureSession(role: CaptureRole, sid: string | null) {
  try {
    if (sid == null) window.localStorage.removeItem(KEYS[role]);
    else window.localStorage.setItem(KEYS[role], sid);
  } catch {
    // Storage blocked: the pairing lasts until the page reloads.
  }
  listeners.forEach((listener) => listener());
}

/** A capture request failed. `status` is the HTTP status, or 0 when the network failed. */
export class CaptureError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(url: string, sid: string | null, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(sid ? { [SESSION_HEADER]: sid } : {}),
      },
    });
  } catch {
    throw new CaptureError("No connection. Check the internet connection.", 0);
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new CaptureError(body.error ?? `Request failed (${res.status}).`, res.status);
  return body;
}

const post = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

// ----- Laptop -----

export function startPairing(sid: string | null, station: string | null) {
  return call<{ session: string; code: string; expiresInSeconds: number }>(
    "/api/capture/pair",
    sid,
    post({ station }),
  );
}

/** Null when the session is gone (unpaired, or expired). */
export async function getPairStatus(sid: string): Promise<PairStatus | null> {
  try {
    return await call<PairStatus>("/api/capture/pair", sid);
  } catch (err) {
    if (err instanceof CaptureError && err.status === 404) return null;
    throw err;
  }
}

export function unpairSession(sid: string) {
  return call<{ ok: true }>("/api/capture/pair", sid, { method: "DELETE" });
}

export async function requestCapture(sid: string, request: CaptureRequest): Promise<CaptureJob> {
  return (await call<{ job: CaptureJob }>("/api/capture/job", sid, post(request))).job;
}

/** Null once the capture has ended (expired, cancelled or replaced). */
export async function getCapture(sid: string, id: string): Promise<CaptureJob | null> {
  try {
    return (await call<{ job: CaptureJob }>(`/api/capture/job?id=${encodeURIComponent(id)}`, sid)).job;
  } catch (err) {
    if (err instanceof CaptureError && err.status === 404) return null;
    throw err;
  }
}

export function cancelCapture(sid: string, id: string) {
  return call<{ ok: true }>(`/api/capture/job?id=${encodeURIComponent(id)}`, sid, {
    method: "DELETE",
  }).catch(() => undefined);
}

// ----- Phone -----

export function joinPairing(code: string) {
  return call<{ session: string; station: string | null }>("/api/capture/join", null, post({ code }));
}

/** A capture waiting for this phone, or null. Throws a 404 CaptureError once unpaired. */
export async function checkForCapture(sid: string, beat: boolean): Promise<CaptureJob | null> {
  return (await call<{ job: CaptureJob | null }>(`/api/capture/phone${beat ? "?beat=1" : ""}`, sid)).job;
}

/** Takes a waiting capture. Null when another phone took it or the laptop cancelled it. */
export async function claimCapture(sid: string, id: string): Promise<CaptureJob | null> {
  try {
    return (await call<{ job: CaptureJob }>("/api/capture/phone", sid, post({ action: "claim", id }))).job;
  } catch (err) {
    if (err instanceof CaptureError && err.status === 409) return null;
    throw err;
  }
}

export type CaptureReport =
  | { action: "captured"; preview: string }
  | { action: "result"; result: CaptureResult }
  | { action: "failed"; error: string };

/** Reports progress to the laptop. False when the laptop has moved on. */
export async function reportCapture(sid: string, id: string, report: CaptureReport): Promise<boolean> {
  try {
    await call<{ ok: true }>("/api/capture/phone", sid, post({ id, ...report }));
    return true;
  } catch (err) {
    if (err instanceof CaptureError && err.status === 409) return false;
    throw err;
  }
}
