# Deployment

This document covers local development, the Supabase database, the Vercel deployment and the GitHub
Actions workflows. It also records the current production topology and the gaps to fix before the
prototype is exposed more widely.

> **Snapshot:** 9 November 2026. Re-check the Vercel and Supabase settings before relying on the
> topology below; project settings and environment variables can change outside this repository.

## 1. Environments

| Environment | App | Database | Purpose |
| --- | --- | --- | --- |
| Local | `bun run dev` on `http://localhost:3000` | Postgres 18 in Docker on `localhost:55432` | Development and demo rehearsal |
| Preview | Manual `bunx vercel deploy` (no Git integration; no per-branch/PR previews) | Supabase (currently the production database) | Review builds |
| Production | <https://prototype-one-green.vercel.app> | Supabase `eu-central-1` | Assessor demo |

The Vercel project is `prototype` under the `charles-personal` scope. This checkout is linked through
the gitignored `.vercel/project.json`; a fresh clone has to run
`bunx vercel link --project prototype --scope charles-personal` (or set
`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`) before CLI deploys. There is no custom domain and no
`vercel.json`.

The project has no Vercel Git integration, so pushes do not create preview deployments and the
dashboard never builds a branch automatically. Use the CLI for a preview, or connect the Vercel
GitHub App if automatic previews are wanted.

## 2. Prerequisites

- **Bun 1.4+** (CI and the database scripts call `bun` directly).
- **Docker** with Compose for the local Postgres.
- **Node.js 20.9+** if you run Next.js without Bun; Vercel uses Node 24.x.
- A Supabase project for cloud deployments.
- A Vercel account and token for CLI deploys, or the GitHub Actions secrets described below.

## 3. Local deployment

### 3.1 First run

```bash
bun install
cp .env.local.example .env.local      # Windows: copy .env.local.example .env.local
docker compose up -d --wait
bun run db:migrate
bun run db:seed
bun run dev
```

Open <http://localhost:3000>. The Docker database listens on **localhost:55432**, not 5432, to avoid
clashing with a local Postgres. Data lives in the Compose volume `smu_pgdata` (Docker names it
`prototype_smu_pgdata`), so `docker compose down` keeps it and `docker compose down -v` removes it.

`docker compose up -d --wait` waits for the health check. `bun run db:up` starts the container
without waiting, so a migration immediately after it can race Postgres startup.

### 3.2 Environment files

The app follows this precedence:

1. Process environment (shell or Vercel).
2. `.env.local` (Next.js, Bun and the Drizzle config).
3. `.env` (Next.js, Bun and the Drizzle config).

`drizzle.config.ts` loads `.env.local` first, then `.env`, and only fills variables that are not
already set. `scripts/seed.ts` and `scripts/check-seed.ts` use `DIRECT_URL ?? DATABASE_URL`; the
running app uses only `DATABASE_URL`.

> **Local database caution.** The env files merge. If `.env.local` does not set `DATABASE_URL` and
> `DIRECT_URL`, the cloud values in `.env` still apply even when `.env.local` exists for other keys.
> `bun run dev`, `db:migrate`, `db:seed` and `db:reset` would then use the cloud database.
>
> Before running a destructive command, print the resolved host:
>
> ```powershell
> (Get-Content .env.local, .env -ErrorAction SilentlyContinue) | Select-String '^DATABASE_URL=|^DIRECT_URL='
> ```
>
> ```bash
> grep -E '^(DATABASE_URL|DIRECT_URL)=' .env.local .env
> ```
>
> The seed script currently has no remote-host guard. Until one is added, make sure the resolved host
> is `localhost:55432` before `db:seed`/`db:reset`. A safe improvement is a `scripts/seed.ts` check
> that refuses a non-local host unless `ALLOW_REMOTE_SEED=1` is set.

### 3.3 Database lifecycle

```bash
bun run db:up        # start Postgres
bun run db:generate  # generate a migration from db/schema.ts
bun run db:migrate   # apply pending migrations
bun run db:seed      # truncate and load the demo data
bun run db:check     # replay the event history and verify bin weights
bun run db:reset     # migrate + seed
bun run db:down      # stop the container (volume is kept)
```

`db:seed` truncates `bin_events`, `news_items`, `programme_events`, `programme_metrics`, `bins` and
`cleaners`, then inserts seven bins, four cleaners and about 30 days of deterministic history.
`listings` and `claims` are legacy tables and are not seeded.

> `db:seed` and `db:reset` are destructive. They target whichever host `DIRECT_URL` (or, failing
> that, `DATABASE_URL`) resolves to; see the caution in §3.2 before running them.

### 3.4 Production build locally

```bash
bun run lint
bun run build
bun run start
bun scripts/check-scale-reading.ts
```

`next build` does not need database credentials because `lib/db.ts` creates the pool lazily. The
running server does need `DATABASE_URL`; without it, `/api/bootstrap` returns 500.

## 4. Configuration matrix

| Variable | Local | Preview | Production | Notes |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Docker URL in `.env.local` | Supabase pooler | Supabase pooler | Runtime; use port 6543 transaction pooler |
| `DIRECT_URL` | Docker URL in `.env.local` | Not set | Not set on Vercel | Migrations and seed prefer it; use port 5432 |
| `DATABASE_SSL` | Usually unset | Not set | Not set | SSL is inferred for Supabase/pooler URLs |
| `OPENROUTER_API_KEY` | Optional | Set | Set | Server-side kiosk chat |
| `HF_SPACE_ID` | Optional | Not set | Not set | Defaults to `kevansoon/PaddleOCR` |
| `HF_TOKEN` | Optional | Not set | Not set | Only for a private OCR Space |
| `NEXT_PUBLIC_DEMO_CONTROLS` | Optional | **Currently `true`** | **Currently `true`** | Client visibility is build-time; server guard is runtime |
| `CRON_SECRET` | Not used | Not set | Set | Currently unreferenced; no cron exists |

Production and Preview currently both have `DATABASE_URL`, `OPENROUTER_API_KEY` and
`NEXT_PUBLIC_DEMO_CONTROLS`, and Preview reuses the production database. Keep the Preview values
until Preview has its own Supabase database, then separate them.

`NEXT_PUBLIC_*` values are inlined into the client bundle at build time. The server 403 guard reads
`process.env.NEXT_PUBLIC_DEMO_CONTROLS` at runtime, so a runtime-only change can leave the UI and the
API guard disagreeing. Rebuild and verify both after changing the value.

## 5. Supabase

Put the Supabase connection strings in `.env` (or in the Vercel environment). Supabase pooler
usernames include the project ref:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.<project-ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres
```

- **6543** is the transaction-mode pooler used by the running app. It works with serverless
  functions and should include `?pgbouncer=true`, although `node-postgres` ignores that hint.
- **5432** is the session-mode/direct connection used by `drizzle-kit` and the seed/check scripts.
- SSL is enabled automatically when the URL contains `supabase.com`, `pooler.supabase` or
  `sslmode=require`; the app, Drizzle config and seed honour `DATABASE_SSL=true` as an override.
  `scripts/check-seed.ts` infers SSL only from `supabase`/`pooler` in the URL. Certificate
  verification is disabled for every SSL connection (`rejectUnauthorized: false`).
- The current database is in `eu-central-1` (Frankfurt).
- If the project is on Supabase Free, it pauses after about a week of low activity (API requests then
  fail) and has no managed backups. Warm it before a demo or upgrade to Pro, which adds daily
  backups. Record the plan in the release notes.

Apply schema changes and seed from a machine with the direct URL. Pass the target explicitly:
`.env.local` overrides `.env`, so a plain `bun run db:migrate` can hit the local Docker database even
when `.env` points at Supabase.

```bash
# Bash
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres" bun run db:migrate
# PowerShell
$env:DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"; bun run db:migrate
```

Take a dump before a destructive migration or seed. On Supabase Free there are no managed backups,
so the dump is the backup:

```bash
pg_dump "$DIRECT_URL" -Fc -f pre-change.dump
```

```powershell
pg_dump $env:DIRECT_URL -Fc -f pre-change.dump
```

Only for a deliberate demo reset, run `bun run db:seed` with the same explicit `DIRECT_URL`. The
deploy workflow does **not** run migrations or seed; treat both as explicit release steps.

## 6. Vercel

### 6.1 Project settings

| Setting | Value |
| --- | --- |
| Framework | Next.js |
| Root directory | `.` (the repository is the app) |
| Node.js | 24.x |
| Install | Bun is supported; CI uses `bun install --frozen-lockfile` with an unpinned `setup-bun@v2` |
| Build | `next build` (or `bun run build`) |
| Region | `iad1` (US East), no failover |
| Memory | 2048 MB per function |
| Function timeout | 300 s default; OCR 60 s, OCR warm 30 s |

`next.config.ts` sets `cacheComponents`, `partialPrefetching` and the Tailwind Turbopack loader. There
is no `vercel.json`, so Vercel uses the Next.js preset defaults: no custom headers, redirects,
crons or region override.

Production has two aliases:

- <https://prototype-one-green.vercel.app> (stable)
- <https://prototype-charles-personal.vercel.app>

The Vercel project currently lives under a personal scope, and deploys use a personal
`VERCEL_TOKEN`. Move the project to the team/org and use the native Git integration, or rotate the
token on a schedule, before treating this as a team deployment.

### 6.2 Environment variables

Production and Preview currently both have `DATABASE_URL`, `OPENROUTER_API_KEY` and
`NEXT_PUBLIC_DEMO_CONTROLS`; Preview reuses the production database. Keep the Preview values until
Preview has its own Supabase database, then set separate Preview values. Set
`NEXT_PUBLIC_DEMO_CONTROLS=false` (or remove it) and redeploy when the URL is shared.

`DIRECT_URL`, `DATABASE_SSL`, `HF_SPACE_ID` and `HF_TOKEN` are not required in Vercel with the
current defaults. Do not add `DIRECT_URL` to the runtime environment unless a server-side job needs
it.

**Preview shares the production `DATABASE_URL`.** Any preview deployment can read and write live
demo data. Create a separate Supabase database or branch for previews before opening previews to
other testers.

### 6.3 GitHub Actions

**CI** (`.github/workflows/ci.yml`) runs on every push and pull request:

```text
bun install --frozen-lockfile
bunx tsc --noEmit
bun run build
```

It does not run lint, tests, `db:check`, the scale-parser check or a smoke test. The build succeeds
without database credentials; API routes only fail at request time. `setup-bun@v2` is unpinned, so CI
tracks the latest Bun; pin `bun-version: 1.4.4` in both workflows if reproducibility matters.

**Deploy** (`.github/workflows/deploy.yml`) runs on pushes to `main` and on manual dispatch:

```text
bunx vercel@59.11.2 deploy --prod --yes --token="$VERCEL_TOKEN"
```

Required repository secrets: `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN`. The job is
serialized with the `deploy-production` concurrency group, and `workflow_dispatch` is ignored unless
the ref is `main`.

CI and Deploy are independent workflows. A push to `main` can deploy even if CI fails. Before
relying on this for a release, gate the deploy on CI (for example with `workflow_run` or a single
workflow) and protect `main`.

### 6.4 Release procedure

1. Run `bun run lint`, `bun run build` and, with a seeded database, `bun run db:check`.
2. Apply any migration against the explicit `DIRECT_URL` **before** the code that needs it is live.
   Use expand/contract changes so the old and new code can coexist during the deploy.
3. Open the PR and wait for CI to pass before merging. Deploy starts on the `main` push and does not
   wait for CI, so a red CI run will not stop the deploy.
4. Merge to `main` (or run the Deploy workflow from `main`); monitor the Deploy run and confirm the
   production alias.
5. Smoke-test `/`, `/dashboard`, `/cleaner`, `/kiosk` and `/api/bootstrap`.

Do not run `db:seed` as part of a normal deploy: it truncates the shared demo data.

### 6.5 Resetting the demo after controls are off

`POST /api/reset` works only while `NEXT_PUBLIC_DEMO_CONTROLS=true`. Once the flag is disabled (the
recommended production setting), reset with an explicit production URL from a trusted machine after
a dump:

```bash
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres" bun run db:seed
```

```powershell
$env:DIRECT_URL="postgresql://postgres.<project-ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:5432/postgres"; bun run db:seed
```

## 7. Rollback

- **Application:** use the dashboard's **Instant Rollback** (Hobby supports the previous deployment),
  or `vercel rollback <previous-deployment-url>`. Use `vercel promote` only to undo a rollback. The
  deploy workflow does not keep a database snapshot.
- **Database:** migrations are forward-only in this repo. Take a `pg_dump` before a destructive
  migration/seed and store it off-site; on Supabase Pro, managed daily backups are also available.
  Prefer a backup/restore or a compensating migration. Expand/contract keeps rollback possible
  because the old code never depends on a column or table that was just removed.
- **Demo data:** resetting with `POST /api/reset` (while demo controls are on) or `bun run db:seed`
  restores the deterministic seed, but it destroys any real readings collected during the demo.

## 8. Verification

```bash
curl -s https://prototype-one-green.vercel.app/api/bootstrap | head -c 200
curl -I https://prototype-one-green.vercel.app/
```

Expected production characteristics at the time of the deployment audit:

- `/` and `/kiosk` are prerendered and served from the Vercel cache.
- `/api/bootstrap` is dynamic, returns 7 bins, 4 cleaners, 4 metrics and the event history.
- The OCR Space is checked on the cleaner weigh step; a sleeping Space returns 503 `waking: true`
  and the client retries for up to 120 seconds.
- The current Supabase database contains the seeded history plus any real demo readings.

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `DATABASE_URL is not set` at runtime | Missing runtime env | Set it in `.env.local` or Vercel; rebuild/redeploy if needed |
| `db:migrate` cannot connect | Docker not ready, wrong port, or neither `DIRECT_URL` nor `DATABASE_URL` is set; a 6543 pooler URL also fails migrations | Use `docker compose up -d --wait`; check port 55432; pass the 5432 session/direct URL for cloud |
| Supabase SSL/certificate error | URL not recognised as Supabase, or SSL forced incorrectly | Let the regex detect it, or set `DATABASE_SSL=true` for the app/Drizzle/seed; `db:check` infers SSL only from the URL |
| Local commands hit the cloud database | `.env` has cloud credentials and `.env.local` is missing or does not set the URLs | Create `.env.local` from `.env.local.example`; print the resolved host before a destructive command |
| `db:migrate` says no migrations | Wrong working directory or journal out of sync | Run from the repo root; inspect `db/migrations/meta/_journal.json` |
| Seed check fails after a manual read | History and bin weight disagree | Re-run `bun run db:reset` locally, or repair the bin/event pair before reseeding |
| OCR returns 503 `waking` | Hugging Face Space is asleep or starting | Wait up to two minutes; open the Space page; set `HF_TOKEN` if private |
| OCR returns 502 | Space error or network failure | Check the Space runtime; retry; inspect function logs |
| Kiosk chat returns 503 | Missing/invalid OpenRouter key or upstream failure | Set `OPENROUTER_API_KEY`; built-in answers still work |
| Demo buttons return 403 | `NEXT_PUBLIC_DEMO_CONTROLS` is not `true` | Enable it for a local/demo build and restart; redeploy for Vercel |
| Camera does not start | Page is not HTTPS/localhost, or permission denied | Use localhost or an HTTPS deployment; allow camera access |
| API is slow from Singapore | Functions in `iad1`, database in `eu-central-1` | Move both to a nearer region, or accept demo latency |
| Vercel build fails on install | Lockfile/Bun mismatch | Run `bun install --frozen-lockfile` locally and commit the lockfile |
| Runtime logs disappear | Vercel Hobby retains runtime logs for about an hour | Capture logs during the demo, or add external logging/alerting |
| Preview URL is stale | No Vercel Git integration; pushes do not create previews | Run `bunx vercel deploy` manually, or connect the Vercel GitHub App |

## 10. Security and release checklist

- [ ] `NEXT_PUBLIC_DEMO_CONTROLS` is unset or `false` on shared deployments, then redeployed.
- [ ] Preview has its own database, or previews are not shared.
- [ ] `DIRECT_URL` is available only where migrations run; it is not exposed to the browser.
- [ ] `OPENROUTER_API_KEY`, `HF_TOKEN`, `VERCEL_TOKEN`, `DATABASE_URL` and `DIRECT_URL` are treated
      as secrets and rotated after exposure.
- [ ] Unused `CRON_SECRET` and `APP_URL` secrets are removed unless a cron or webhook is added.
- [ ] `main` is protected; the PR's CI run is green before merging.
- [ ] Migrations are applied before the code that needs them.
- [ ] A `pg_dump` (or a managed backup on Supabase Pro) exists before a destructive seed or migration.
- [ ] The public demo URL is treated as untrusted: `/api/readings`, `/api/collect`, `/api/sync`,
      `/api/simulate` and `/api/reset` have no auth or CSRF protection.
- [ ] The Vercel project is moved to the team scope or the personal `VERCEL_TOKEN` is rotated.

## 11. Known production gaps

These are recorded from the deployment audit; they are not fixed by this documentation change.

1. **Demo controls are enabled in production and preview.** The baked client bundle contains
   `NEXT_PUBLIC_DEMO_CONTROLS=true`, and the server routes honour it. Anyone with the URL can call
   `/api/reset`, which truncates and reseeds the shared database, and `/api/sync` or `/api/simulate`,
   which write readings. Set the variable to `false` and redeploy.
2. **Preview and production share one Supabase database**, so preview testing can mutate live demo
   data. There is also no Vercel Git integration, so previews are manual.
3. **Deploys are not gated on CI and migrations are manual.** A failed CI run does not block a
   production deploy.
4. **The app and database are far from the users.** Functions run in `iad1`, the database is in
   `eu-central-1`, and the assessors are in Singapore; `/api/bootstrap` was measured at roughly
   0.76-1.4 s from Singapore.
5. **The mutating API has no authentication or CSRF protection.** `/api/readings` and `/api/collect`
   accept writes; `/api/sync`, `/api/simulate` and `/api/reset` are bodyless POSTs gated only by the
   demo flag. OCR and chat are public and can be abused.
6. **There is no health endpoint, structured logging or alerting.** Failures are visible in Vercel
   function logs only, and Hobby retains runtime logs for about an hour.
7. **The Supabase plan is not recorded.** On Free the project pauses after about a week of low
   activity and has no managed backups; a demo can fail after an idle period. Warm the project before
   the demo or upgrade to Pro.
8. **Unused secrets remain configured.** `CRON_SECRET` (Vercel and GitHub) and `APP_URL` (GitHub) are
   not referenced by any workflow or route. Remove them unless a cron or webhook is added.
