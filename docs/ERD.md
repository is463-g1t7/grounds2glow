# Entity-relationship diagram

The schema is defined in [`db/schema.ts`](../db/schema.ts) and applied by the migrations in
[`db/migrations/`](../db/migrations/). The diagram is Mermaid source so GitHub renders it directly.

```mermaid
erDiagram
    CLEANERS |o--o{ BIN_EVENTS : "signs in (deposits)"
    BINS ||--o{ BIN_EVENTS : "records"

    CLEANERS {
        text id PK
        text name
        text initials
        text pass UK
        text shift "AM or PM"
        text vendor
    }

    BINS {
        text id PK
        text short
        text name
        text pantry
        numeric weight_kg
        numeric capacity_kg
        integer levels
        timestamptz updated_at
    }

    BIN_EVENTS {
        text id PK
        timestamptz at
        text bin_id FK
        integer level
        text pantry
        text type "deposit or collect"
        numeric kg
        text cleaner_id FK
        text collected_by
        text source "nullable: ocr, reference, manual or demo"
        numeric before_kg
        numeric after_kg
        text photo
    }

    NEWS_ITEMS {
        text id PK
        text title
        text tag
        date published_at
        text image
        text href
        integer sort
    }

    PROGRAMME_EVENTS {
        text id PK
        text title
        date event_date
        text venue
        text description
        text image
        integer sort
    }

    PROGRAMME_METRICS {
        text key PK
        text value
        text label
        text detail
        text tone
        integer sort
    }
```

## Table status

| Table | Status | Notes |
| --- | --- | --- |
| `bins` | Active | Seven building bins; current weight, capacity and pantry levels |
| `cleaners` | Active | Demo staff roster and unique pass numbers |
| `bin_events` | Active | Deposits and collections; the audit trail behind every weight |
| `programme_metrics` | Active | Landing impact cards; seeded demo values |
| `news_items` | Seeded, not surfaced | No current UI |
| `programme_events` | Seeded, not surfaced | No current UI; some seeded dates are upcoming |
| `listings` | Dropped | Removed marketplace; dropped in migration `0003_optimal_mole_man.sql` |
| `claims` | Dropped | Removed marketplace; dropped in migration `0003_optimal_mole_man.sql` |

## Constraints and indexes

- `cleaners.pass` is unique; `cleaners.shift` is `AM` or `PM`.
- `bins.weight_kg >= 0`, `bins.capacity_kg > 0` and `bins.levels > 0`.
- `bin_events.type` is `deposit` or `collect`; `kg >= 0`; `source` is nullable, and deposits set
  `ocr`, `reference`, `manual` or `demo` while collection events leave it null.
- `bin_events.bin_id` references `bins.id` with `ON DELETE CASCADE`; `bin_events.cleaner_id`
  references `cleaners.id` with `ON DELETE SET NULL`.
- Indexes: `bin_events(bin_id, at desc)`, `bin_events(at desc)`.
- Weights are `numeric(7,3)` so stored values keep gram precision.

The application writes a deposit and updates the bin in one transaction with a row lock. The history
therefore remains consistent even when two demo controls run at once. `bun run db:check` replays the
event chain and verifies that it ends at each bin's current weight.
