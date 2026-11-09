import "server-only";
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
