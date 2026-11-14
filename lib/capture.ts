import "server-only";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { redis } from "./cache";
import {
  PAIR_CODE_SECONDS,
  SESSION_HEADER,
  type CaptureJob,
  type CaptureRequest,
  type CaptureResult,
  type PairStatus,
} from "./capture-types";

/**
 * The relay between the laptop at a bin and the phone that photographs its scale.
 *
 * Vercel functions can't hold a connection open, so neither device can push to the other. Both
 * poll a small job record instead. It lives in Upstash Redis (the same database as the bootstrap
 * cache), and every key expires on its own, so nothing here touches Postgres. Without Redis
 * (local development) an in-memory store stands in; that only works on one server process, so on
 * Vercel the relay refuses to run without Redis.
 */

const PREFIX = "smu-circular-coffee:capture:v1";
/** A paired laptop and phone stay paired this long after the last capture. */
const SESSION_SECONDS = 7 * 24 * 60 * 60;
/** A capture nobody finishes is dropped after this long. */
const JOB_SECONDS = 3 * 60;
/** The phone counts as online this long after it last checked in. */
const PHONE_ONLINE_SECONDS = 15;
/** Wrong pairing codes allowed per address before joining is locked for the code lifetime. */
const MAX_JOIN_FAILURES = 20;

type Session = { createdAt: string; station: string | null; phonePairedAt: string | null };

const key = {
  session: (sid: string) => `${PREFIX}:session:${sid}`,
  code: (code: string) => `${PREFIX}:code:${code}`,
  job: (sid: string) => `${PREFIX}:job:${sid}`,
  claim: (jobId: string) => `${PREFIX}:claim:${jobId}`,
  phone: (sid: string) => `${PREFIX}:phone:${sid}`,
  joinFailures: (ip: string) => `${PREFIX}:join-failures:${ip}`,
};

// ----- Storage: Upstash Redis, or memory for local development -----

type Store = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, seconds: number): Promise<void>;
  /** Sets the key only if it doesn't exist. Returns whether it was set. */
  setIfAbsent(key: string, value: unknown, seconds: number): Promise<boolean>;
  del(...keys: string[]): Promise<void>;
  /** Adds one and returns the new count. The count expires `seconds` after it was first set. */
  incr(key: string, seconds: number): Promise<number>;
};

const redisStore = (client: NonNullable<typeof redis>): Store => ({
  get: (k) => client.get(k),
  async set(k, value, seconds) {
    await client.set(k, value, { ex: seconds });
  },
  async setIfAbsent(k, value, seconds) {
    return (await client.set(k, value, { ex: seconds, nx: true })) === "OK";
  },
  async del(...keys) {
    await client.del(...keys);
  },
  async incr(k, seconds) {
    const count = await client.incr(k);
    if (count === 1) await client.expire(k, seconds);
    return count;
  },
});

type MemoryEntry = { value: unknown; expires: number };
// Kept on globalThis so a dev-server reload doesn't forget the pairing.
const memory: Map<string, MemoryEntry> = ((globalThis as { __captureMemory?: Map<string, MemoryEntry> })
  .__captureMemory ??= new Map());

function memoryGet(k: string): unknown {
  const entry = memory.get(k);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    memory.delete(k);
    return null;
  }
  return entry.value;
}

const memoryStore: Store = {
  async get<T>(k: string) {
    // Copy, so callers can't change the stored value by mutating what they got.
    const value = memoryGet(k);
    return value == null ? null : (structuredClone(value) as T);
  },
  async set(k, value, seconds) {
    memory.set(k, { value: structuredClone(value), expires: Date.now() + seconds * 1000 });
  },
  async setIfAbsent(k, value, seconds) {
    if (memoryGet(k) != null) return false;
    memory.set(k, { value: structuredClone(value), expires: Date.now() + seconds * 1000 });
    return true;
  },
  async del(...keys) {
    keys.forEach((k) => memory.delete(k));
  },
  async incr(k, seconds) {
    const current = memoryGet(k);
    const count = (typeof current === "number" ? current : 0) + 1;
    const expires = current == null ? Date.now() + seconds * 1000 : memory.get(k)!.expires;
    memory.set(k, { value: count, expires });
    return count;
  },
};

const store: Store = redis ? redisStore(redis) : memoryStore;

/** Why the relay can't run here, or null when it can. */
export function captureUnavailable(): string | null {
  if (redis || !process.env.VERCEL) return null;
  return "The phone camera needs Upstash Redis. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.";
}

// ----- Requests -----

const SESSION_PATTERN = /^[A-Za-z0-9_-]{32}$/;

/** The capture session the request carries, or null when it carries none (or a malformed one). */
export function sessionFrom(request: Request): string | null {
  const sid = request.headers.get(SESSION_HEADER);
  return sid && SESSION_PATTERN.test(sid) ? sid : null;
}

function clientAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

// ----- Pairing -----

/**
 * Gives the laptop a pairing code for the phone to enter. Keeps the laptop's session when it
 * still exists, so a phone that's already paired stays paired.
 */
export async function createPairing(existing: string | null, station: string | null) {
  let sid = existing;
  const session = sid ? await store.get<Session>(key.session(sid)) : null;
  if (!sid || !session) {
    sid = randomBytes(24).toString("base64url");
    await store.set(
      key.session(sid),
      { createdAt: new Date().toISOString(), station, phonePairedAt: null } satisfies Session,
      SESSION_SECONDS,
    );
  } else if (session.station !== station) {
    await store.set(key.session(sid), { ...session, station }, SESSION_SECONDS);
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    if (await store.setIfAbsent(key.code(code), sid, PAIR_CODE_SECONDS)) {
      return { session: sid, code, expiresInSeconds: PAIR_CODE_SECONDS };
    }
  }
  throw new Error("Couldn't make a pairing code. Try again.");
}

export type JoinResult =
  | { ok: true; session: string; station: string | null }
  | { ok: false; reason: "invalid" | "locked" };

/** The phone trades a pairing code for the session. Each code works once. */
export async function joinWithCode(code: string, request: Request): Promise<JoinResult> {
  const failuresKey = key.joinFailures(clientAddress(request));
  const failures = (await store.get<number>(failuresKey)) ?? 0;
  if (failures >= MAX_JOIN_FAILURES) return { ok: false, reason: "locked" };

  const sid = /^\d{6}$/.test(code) ? await store.get<string>(key.code(code)) : null;
  const session = sid ? await store.get<Session>(key.session(sid)) : null;
  if (!sid || !session) {
    await store.incr(failuresKey, PAIR_CODE_SECONDS);
    return { ok: false, reason: "invalid" };
  }
  await store.del(key.code(code));
  await store.set(
    key.session(sid),
    { ...session, phonePairedAt: new Date().toISOString() } satisfies Session,
    SESSION_SECONDS,
  );
  await store.set(key.phone(sid), Date.now(), PHONE_ONLINE_SECONDS);
  return { ok: true, session: sid, station: session.station };
}

/** Whether a phone has joined the session and is online. Null when the session is gone. */
export async function pairStatus(sid: string): Promise<PairStatus | null> {
  const [session, seen] = await Promise.all([
    store.get<Session>(key.session(sid)),
    store.get<number>(key.phone(sid)),
  ]);
  if (!session) return null;
  return {
    paired: session.phonePairedAt != null,
    pairedAt: session.phonePairedAt,
    phoneOnline: seen != null,
    station: session.station,
  };
}

/** Forgets the session. Both the laptop and the phone have to pair again. */
export async function unpair(sid: string): Promise<void> {
  await store.del(key.session(sid), key.job(sid), key.phone(sid));
}

// ----- Captures: the laptop's side -----

/** Starts a capture, replacing any earlier one. Null when the session is gone. */
export async function createJob(sid: string, request: CaptureRequest): Promise<CaptureJob | null> {
  const session = await store.get<Session>(key.session(sid));
  if (!session) return null;
  const job: CaptureJob = {
    ...request,
    id: randomUUID(),
    status: "waiting",
    createdAt: new Date().toISOString(),
    preview: null,
    result: null,
    error: null,
  };
  await Promise.all([
    store.set(key.job(sid), job, JOB_SECONDS),
    // Using the pairing keeps it alive.
    store.set(key.session(sid), session, SESSION_SECONDS),
  ]);
  return job;
}

/** The capture with this id, or null once it has expired, been cancelled or been replaced. */
export async function getJob(sid: string, id: string): Promise<CaptureJob | null> {
  const job = await store.get<CaptureJob>(key.job(sid));
  return job?.id === id ? job : null;
}

export async function cancelJob(sid: string, id: string): Promise<void> {
  if (await getJob(sid, id)) await store.del(key.job(sid));
}

// ----- Captures: the phone's side -----

/**
 * What the phone sees when it checks for work: a capture waiting for it, or null.
 * With `beat`, it also marks the phone online and checks the pairing still exists;
 * `paired: false` tells the phone to forget it.
 */
export async function phoneCheck(
  sid: string,
  beat: boolean,
): Promise<{ paired: boolean; job: CaptureJob | null }> {
  if (beat) {
    const session = await store.get<Session>(key.session(sid));
    if (!session) return { paired: false, job: null };
    await store.set(key.phone(sid), Date.now(), PHONE_ONLINE_SECONDS);
  }
  const job = await store.get<CaptureJob>(key.job(sid));
  return { paired: true, job: job?.status === "waiting" ? job : null };
}

/** The phone takes a waiting capture. Only one phone can take each one. */
export async function claimJob(sid: string, id: string): Promise<CaptureJob | null> {
  if (!(await store.setIfAbsent(key.claim(id), sid, JOB_SECONDS))) return null;
  const job = await getJob(sid, id);
  if (!job || job.status !== "waiting") return null;
  const next: CaptureJob = { ...job, status: "capturing" };
  await store.set(key.job(sid), next, JOB_SECONDS);
  return next;
}

export type PhoneUpdate =
  | { type: "captured"; preview: string }
  | { type: "result"; result: CaptureResult }
  | { type: "failed"; error: string };

/** The phone reports progress on a capture it took. False when the laptop has moved on. */
export async function updateJob(sid: string, id: string, update: PhoneUpdate): Promise<boolean> {
  const job = await getJob(sid, id);
  if (!job || job.status === "waiting" || job.status === "done" || job.status === "failed") return false;
  const next: CaptureJob =
    update.type === "captured"
      ? { ...job, status: "reading", preview: update.preview }
      : update.type === "result"
        ? { ...job, status: "done", result: update.result }
        : { ...job, status: "failed", error: update.error };
  await store.set(key.job(sid), next, JOB_SECONDS);
  return true;
}
