import { Pool } from "pg";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const ssl = /supabase|pooler/i.test(url ?? "") ? { rejectUnauthorized: false } : undefined;
const pool = new Pool({ connectionString: url, ssl });

const bins = await pool.query("select id, weight_kg::float8 as weight, capacity_kg::float8 as capacity, updated_at from bins order by id");
const events = await pool.query(
  "select id, at, bin_id, type, kg::float8 as kg, before_kg::float8 as before, after_kg::float8 as after from bin_events order by bin_id, at"
);
const claims = await pool.query("select count(*)::int as count from claims");
const claimed = await pool.query("select count(*)::int as count from listings where claimed");

let failures = 0;
function check(ok: boolean, message: string) {
  console.log(`${ok ? "ok" : "FAIL"}: ${message}`);
  if (!ok) failures++;
}

for (const bin of bins.rows) {
  const history = events.rows.filter((e) => e.bin_id === bin.id);
  let running = 0;
  for (const e of history) {
    if (e.before != null) check(Math.abs(e.before - running) < 0.001, `${bin.id} ${e.id} starts at ${running}`);
    if (e.type === "collect") {
      check(Math.abs(e.after) < 0.001, `${bin.id} ${e.id} empties`);
      running = 0;
    } else {
      running = e.after ?? running;
    }
    if (e.after != null) check(Math.abs(e.after - running) < 0.001, `${bin.id} ${e.id} ends at ${running}`);
  }
  check(Math.abs(running - bin.weight) < 0.001, `${bin.id} history ends at bin weight ${bin.weight}`);
  const newest = history[history.length - 1];
  check(
    newest != null && new Date(newest.at).getTime() === new Date(bin.updated_at).getTime(),
    `${bin.id} updated_at matches latest event`
  );
}

check(claims.rows[0].count === claimed.rows[0].count, "claims rows match claimed listings");
await pool.end();
if (failures) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
