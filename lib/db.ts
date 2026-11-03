import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const needsSsl =
  process.env.DATABASE_SSL === "true" ||
  /supabase\.(com|co)|pooler\.supabase|sslmode=require/i.test(connectionString);

const globalForDb = globalThis as unknown as { smuPool?: Pool };

export const pool =
  globalForDb.smuPool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error", err);
});

if (process.env.NODE_ENV !== "production") globalForDb.smuPool = pool;

export const db = drizzle(pool, { schema });
