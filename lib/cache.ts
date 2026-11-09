import "server-only";
import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

/**
 * Upstash Redis is provisioned through the Vercel Marketplace. Vercel KV-style
 * names are accepted too, so the cache works with either integration shape.
 * When neither is configured (local development, CI build), the cache is a no-op
 * and every request reads Postgres directly.
 */
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

const BOOTSTRAP_KEY = "smu-circular-coffee:bootstrap:v1";
/** Short enough that live demo data is never far behind, long enough to absorb polls. */
const BOOTSTRAP_TTL_SECONDS = 15;

const KIOSK_ANSWER_PREFIX = "smu-circular-coffee:kiosk-answer:v1";
/** Kiosk facts change slowly; a day keeps repeated questions free without going stale for long. */
const KIOSK_ANSWER_TTL_SECONDS = 60 * 60 * 24;

/** Case, spacing and trailing punctuation should not create a second cache entry. */
function kioskAnswerKey(prompt: string): string {
  const normalized = prompt
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?.!]+$/g, "");
  const digest = createHash("sha256").update(normalized).digest("hex");
  return `${KIOSK_ANSWER_PREFIX}:${digest}`;
}

export const cacheConfigured = redis !== null;

export async function readBootstrapCache<T>(): Promise<T | null> {
  if (!redis) return null;
  try {
    return await redis.get<T>(BOOTSTRAP_KEY);
  } catch (error) {
    console.warn("[cache] bootstrap read failed", error);
    return null;
  }
}

export async function writeBootstrapCache<T>(value: T): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(BOOTSTRAP_KEY, value, { ex: BOOTSTRAP_TTL_SECONDS });
  } catch (error) {
    console.warn("[cache] bootstrap write failed", error);
  }
}

export async function clearBootstrapCache(): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(BOOTSTRAP_KEY);
  } catch (error) {
    console.warn("[cache] bootstrap clear failed", error);
  }
}

export async function readKioskAnswerCache(prompt: string): Promise<string | null> {
  if (!redis) return null;
  try {
    return await redis.get<string>(kioskAnswerKey(prompt));
  } catch (error) {
    console.warn("[cache] kiosk answer read failed", error);
    return null;
  }
}

export async function writeKioskAnswerCache(prompt: string, answer: string): Promise<void> {
  if (!redis || !answer.trim()) return;
  try {
    await redis.set(kioskAnswerKey(prompt), answer, { ex: KIOSK_ANSWER_TTL_SECONDS });
  } catch (error) {
    console.warn("[cache] kiosk answer write failed", error);
  }
}
