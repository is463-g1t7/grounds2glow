# SMU Circular Coffee

A redesigned SMU Circular Coffee prototype. The app is built with Next.js 16 (App Router),
Postgres and Drizzle ORM, and uses the SMU design system from `../docs/DESIGN.md`.

## What is in here

- Landing page that follows the loop from pantry staff to live dashboard to kiosk, with live bin
  data, the kiosk chat and a three-minute demo route.
- Live operations dashboard and programme reporting.
- Cleaner flow: pass scan → pantry picker → weigh station, with a printable pass sheet.
- Scale scanner and OCR reader tools.
- Grounds to Glow kiosk: welcome, check-in, QR guide, recipe, dispensing, thanks and
  `?chat=1` mobile chat. Common questions get deterministic answers; other questions go to
  OpenRouter using `z-ai/glm-5.3-flash` with a kiosk-specific system prompt.
- Postgres-backed bins, audit events, cleaners, news, programme events and programme metrics.
- Drizzle schema (`db/schema.ts`), generated migrations (`db/migrations/`) and a single
  seed script (`scripts/seed.ts`).

## Local setup

Requirements: Bun 1.4+, Docker.

```bash
bun install
cp .env.local.example .env.local   # Windows: copy .env.local.example .env.local
docker compose up -d
bun run db:migrate
bun run db:seed
bun run dev
```

Open http://localhost:3000.

The Docker database listens on **localhost:55432** (not 5432, to avoid clashing with a
local Postgres). The compose file uses the `postgres:18` image and a named volume,
`smu_pgdata`. The local `.env.local` points both `DATABASE_URL` and `DIRECT_URL` at it.

### Database commands

```bash
bun run db:up        # start Postgres 18
bun run db:generate  # generate a new SQL migration from db/schema.ts
bun run db:migrate   # apply pending Drizzle migrations
bun run db:seed      # load scripts/seed.ts data
bun run db:check     # verify seeded history and weights agree
bun run db:reset     # migrate + seed
bun run db:down      # stop the container (volume is kept)
```

`db:migrate` uses `DIRECT_URL` when present, then `DATABASE_URL`. `scripts/seed.ts` uses the
same precedence. `drizzle.config.ts` loads `.env.local` first, then `.env`, so local Docker
and Supabase credentials can coexist. Bun loads both files automatically for `db:seed`.

## Supabase

The production-style database is Supabase. Put the pooler connection strings in `.env`:

```env
DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://...pooler.supabase.com:5432/postgres
```

Then run:

```bash
bun run db:migrate
bun run db:seed
```

The empty Supabase database has been migrated with Drizzle and seeded with the same data as
the local Docker database.

## Data model

| Table | Purpose |
| --- | --- |
| `bins` | Seven building bins, current weight, capacity, pantry levels |
| `cleaners` | Demo staff roster and pass numbers |
| `bin_events` | Deposits and collections, with cleaner/source/before/after audit fields |
| `listings` | Unused: kept from the removed marketplace, not seeded or reset |
| `claims` | Unused: kept from the removed marketplace, not seeded or reset |
| `news_items` | Unused: no longer shown on the landing page |
| `programme_events` | Unused: no longer shown on the landing page |
| `programme_metrics` | Programme-to-date impact metrics, set by the seed script |

All demo rows live in `scripts/seed.ts`; there are no entity data arrays in components.

## API

| Route | Purpose |
| --- | --- |
| `GET /api/bootstrap` | All data needed by the client surfaces |
| `POST /api/readings` | Record a floor-scale reading and update the bin |
| `POST /api/collect` | Empty a bin and write an audit event |
| `POST /api/sync` | Insert a simulated remote scale reading (demo controls only) |
| `POST /api/simulate` | One demo live-day step, including auto-collect (demo controls only) |
| `POST /api/kiosk-chat` | Grounds to Glow chat via OpenRouter |
| `POST /api/reset` | Re-run `scripts/seed.ts` (demo controls only) |

Reset, Sync and Simulate return 403, and their buttons stay hidden, unless
`NEXT_PUBLIC_DEMO_CONTROLS=true` is set. Leave it unset on shared deployments, because anyone who
can reach the site could otherwise wipe the bin history.

## Design

The shared SMU design system is documented in `../docs/DESIGN.md`. The app uses Oswald for
display, Libre Franklin for body text, SMU gold `#8A704C`, navy `#141B4D` and limestone
`#E8E2DA`, with the fixed two-plane header, off-canvas menu, search overlay, page headers and
footer matching the reference site.

The implementation is a port of the Vite design prototype in
`../.scratch/smu-redesign`; the product surfaces are intentionally 1:1. The landing page has since
been rebuilt around the loop (see `PRODUCT.md`).

## Verification

```bash
bun run lint
bun run build
# with the Docker DB up and seeded:
curl http://localhost:3000/api/bootstrap
```

Kiosk chat requires `OPENROUTER_API_KEY` in `.env` (or `.env.local`). Without it, the kiosk's
deterministic answers still work and the API returns 503.

The Playwright smoke test used during the port lives at
`../.scratch/smu-reference/prototype-smoke.mjs` and covers DB seed/reset, dashboard simulation,
marketplace claims, the cleaner flow, the kiosk flow and kiosk chat.
