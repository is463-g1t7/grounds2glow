import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  smuPool?: Pool;
  smuDb?: Database;
};

/**
 * Lazily create the pool so importing a route during `next build` does not
 * require database credentials. The first real query still fails loudly when
 * DATABASE_URL is missing.
 */
export function getDb(): Database {
  if (globalForDb.smuDb) return globalForDb.smuDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }

  const needsSsl =
    process.env.DATABASE_SSL === "true" ||
    /supabase\.(com|co)|pooler\.supabase|sslmode=require/i.test(connectionString);

  const pool =
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

  globalForDb.smuPool = pool;
  globalForDb.smuDb = drizzle(pool, { schema });
  return globalForDb.smuDb;
}
