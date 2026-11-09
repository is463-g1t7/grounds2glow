# SMU Circular Coffee

A working prototype of SMU's circular coffee loop. Pantry staff and cleaners weigh spent coffee
grounds at a building bin, the reading lands on a live operations dashboard, and the Grounds to Glow
kiosk turns grounds into a body scrub with an AI guide. Built for the IS463 demo.

Stack: Next.js 16 (App Router) · React 19 · Postgres 18 + Drizzle · Tailwind CSS 4 · Bun.

## Quick start

Requirements: Bun 1.4+ and Docker.

```bash
bun install
cp .env.local.example .env.local   # Windows: copy .env.local.example .env.local
docker compose up -d --wait
bun run db:migrate
bun run db:seed
bun run dev
```

Open http://localhost:3000. The Docker database listens on **localhost:55432** and keeps its data in
the `smu_pgdata` volume.

## Routes to try

| Route | What it shows |
| --- | --- |
| `/` | Landing page: intro and three-stage loop, live bins, dashboard and kiosk chat |
| `/dashboard` | Live operations, collection status and programme reporting |
| `/cleaner` | Cleaner check-in by staff-pass barcode (or typed pass) |
| `/cleaner/building` | Pantry-level picker for the cleaner's building |
| `/cleaner/weigh` | Weigh station: sample, upload or typed weight with real OCR |
| `/kiosk` | Grounds to Glow kiosk; add `?chat=1` for the mobile chat |
| `/passes` | Printable demo staff passes |
| `/scan` | Scale scanner demo: sample or upload a display photo (simulated OCR) and deposit |
| `/ocr` | Demo OCR tool (simulated OCR) |

Cleaner stations remember their setup in the browser: `?station=<bin-id>` (or `none`), `?scale=g` for
a gram scale, and `?demo=1`/`?demo=0` for demo states. See `docs/DEMO.md` for the recording script.

## Configuration and scripts

Local defaults live in `.env.local.example`. The full environment matrix and every database script
are in [Deployment](docs/DEPLOYMENT.md). In short, `bun run db:up`, `db:migrate`, `db:seed` and
`db:check` manage the Docker database, while `bun run dev`, `build`, `start` and `lint` run the app.

`NEXT_PUBLIC_DEMO_CONTROLS=true` exposes Reset, Sync, Simulate, demo states and the OCR pipeline
readout. Leave it unset on shared deployments: anyone who can reach the site could otherwise reset
the shared demo data and destroy readings collected during the demo.

The dashboard cache is optional. If `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are
set, `/api/bootstrap` caches a 15-second snapshot in Upstash Redis; otherwise it reads Postgres
directly. The dashboard refreshes on open, on tab focus and with the Refresh button, which bypasses
the cache.

## Verify

```bash
bun run lint
bun run build
# with `bun run dev` running in another terminal and the Docker database seeded:
curl http://localhost:3000/api/bootstrap
```

The cleaner weigh step calls the PaddleOCR Space on Hugging Face; `/scan` and `/ocr` still use
simulated OCR. When `OPENROUTER_API_KEY` is missing, pre-written guidance still answers matching
kiosk questions; unmatched questions show the offline message.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — containers, components, flows, API and green computing
- [Deployment](docs/DEPLOYMENT.md) — local Docker setup, Supabase, Vercel and CI/CD
- [ERD](docs/ERD.md) — Mermaid entity-relationship diagram
- [C4 diagrams](docs/diagrams/) — draw.io sources with rendered PNG/SVG
- [Product](docs/PRODUCT.md) — users, purpose and product principles
- [Design system](docs/DESIGN.md) — SMU tokens, type, layout and components
- [Demo script](docs/DEMO.md) — narrated cleaner-flow walkthrough
- [Feature parity archive](docs/archive/FEATURE-PARITY.md) — historical Vite-port audit
- [SMU reference](docs/reference/SMU-REFERENCE.md) — design provenance and source links
