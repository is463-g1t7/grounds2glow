# Grounds to Glow

A working prototype of Group 7's Grounds to Glow project. Pantry staff and cleaners weigh spent coffee
grounds at a building bin, the reading lands on a live operations dashboard, and the Grounds to Glow
kiosk turns grounds into a body scrub with an AI guide.

Stack: Next.js 16 (App Router) · React 19 · Postgres 18 + Drizzle · Tailwind CSS 4 · Bun.

# Access URLs

Deployed url: https://grounds2glow.vercel.app/
Local url: http://localhost:3000

## Steps to run the prototype locally

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
the `smu_pgdata` volume. `db:seed` loads the sample bins, readings and coffee-scrub dispenses.

On Windows, if Docker says the port is forbidden ("An attempt was made to access a socket in a way
forbidden by its access permissions"), the port sits in a range Windows has reserved. See
[Deployment](docs/DEPLOYMENT.md) troubleshooting.

## Routes to try

| Route | What it shows |
| --- | --- |
| `/` | Landing page: intro and three-stage loop, live bins, dashboard and kiosk chat |
| `/dashboard` | Live operations, collection status, programme reporting and coffee scrubs dispensed |
| `/cleaner` | **Live** smart bin station: check in by staff-pass barcode (or typed pass) |
| `/cleaner/building` | Live: pantry-level picker for the cleaner's building |
| `/cleaner/weigh` | Live: photograph the scale (phone, upload) or type the weight, read by real OCR |
| `/cleaner/pair`, `/cleaner/camera` | Live only: pair a phone camera with the laptop (`pair`), and the phone's side (`camera`) |
| `/kiosk` | Grounds to Glow kiosk; each dispensed scrub is counted on the dashboard. Add `?chat=1` for the mobile chat |
| `/passes` | Demo staff passes (work at either station); linked from both check-in screens |
| `/demo` | Explains live vs demo and links to everything below |
| `/demo/cleaner/*` | **Demo** station: the same screens, reading a sample scale photo. No phone pairing |
| `/demo/scan` | **Demo** scale scanner: simulated, posts a sample reading |
| `/demo/ocr` | **Demo** OCR reader: simulated, saves nothing |

## Configuration and scripts

Local defaults live in `.env.local.example`. The full environment matrix and every database script
are in [Deployment](docs/DEPLOYMENT.md). In short, `bun run db:up`, `db:migrate`, `db:seed` and
`db:check` manage the Docker database, while `bun run dev`, `build`, `start` and `lint` run the app.

`NEXT_PUBLIC_DEMO_CONTROLS=true` exposes the dashboard's Reset, Sync and Simulate buttons. It no longer
affects the cleaner station, which is live or demo by URL only. Leave it unset on shared deployments: anyone who can reach the site could otherwise reset
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

The live cleaner weigh step calls the PaddleOCR Space on Hugging Face; `/demo/scan` and `/demo/ocr`
use simulated OCR. When `OPENROUTER_API_KEY` is missing, pre-written guidance still answers matching
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
