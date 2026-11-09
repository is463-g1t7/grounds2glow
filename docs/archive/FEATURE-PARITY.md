# Feature parity — original prototype → SMU redesign

> **Historical — do not use as the current feature list.** This audit describes the Vite redesign in
> `.scratch/smu-redesign` as of 3 November 2026. The current app is the Next.js app in this
> repository: Postgres + Drizzle instead of localStorage, real PaddleOCR on the cleaner weigh step,
> the rebuilt landing loop, and no marketplace or news surfaces. Kept for provenance.

This maps every feature in the original Next.js prototype (`../../prototype`) to the Vite
redesign. All routes below are in the project workspace's `.scratch/smu-redesign`.

## Shared data layer

| Original | Redesign |
| --- | --- |
| `lib/bins.ts` — 7 building bins, 10 kg capacity, levels | `src/lib/bins.ts` — same model |
| `lib/analytics.ts` — deposits, collections, velocity, ETA, rankings, quiet pantries | `src/lib/analytics.ts` — same calculations |
| `lib/cleaners.ts` — 4 demo passes | `src/lib/cleaners.ts` — same roster and QR assets |
| `lib/store.ts` — localStorage bins/events, cross-tab storage events | `src/lib/store.ts` — same keys, plus a same-tab custom event so every surface updates immediately |
| `lib/scales.ts` — 3 overhead scale frames | `src/lib/scales.ts` — same frames |
| `lib/readings.ts` / `/api/readings` — in-memory server readings | **Simulated sync**: the dashboard “Sync” button posts a fresh demo reading into the shared store |
| `lib/ocr.ts` / `/api/ocr` / `/api/scale-photo` — PaddleOCR proxy | **Demo OCR**: `src/lib/demo-ocr.ts` returns labelled sample lines/boxes, so the upload, overlay, scale and audit flows work offline |
| Kiosk Supabase edge function + Botpress iframe | **Built-in Grounds to Glow guide**: same knowledge, quiz and safety logic in `KioskChat`, using the app’s AI Elements |

## Pages and flows

### OCR reader — `/ocr`

- Drag/drop or browse, PNG/JPEG/WebP, 4 MB validation.
- Language selector for English, Chinese, French, German, Korean, Japanese.
- Extract action with elapsed timer; copy all.
- Image preview with OCR boxes; hover line ↔ box highlight.
- Empty, error and “no text” states; the “Test empty result” control exercises the empty result.
- **Substitution:** sample OCR output (clearly labelled “Demo OCR”) instead of the PaddleOCR Space.

### Scale scanner — `/scan`

- Bin and pantry-level selectors.
- Camera (getUserMedia) or LCD-photo upload.
- Capture, simulated scale OCR, result card with kg + pantry.
- Status rows for scale photo / phone OCR / upload.
- Writes to the shared bin/event store; deep link to `/dashboard?bin=…`.
- **Substitution:** reading comes from known scale frames rather than the OCR Space.

### Smart-bin dashboard — `/dashboard`

- Original header actions: Cleaner app (new tab), Simulate live day / Pause, Reset.
- Live drop-off banner with cleaner, pantry, delta and before→after totals; dismiss.
- Fleet total, repurposed this month, needs collection, pantry empties today.
- All / Needs collection / OK filters with map and spotlight dimming.
- Sync readings; export a full CSV report.
- Campus map with seven pins, status colours, hover cards, selection, dimming.
- Bin spotlight with keyboard-accessible tabs, fill bar, ETA, top pantry, mark collected.
- Audit trail: cleaner/level filters, CSV, pagination/show-all, source badges, scale photo link, highlighted live row.
- Manual cleaner panel: cleaner, building, level, caddy amount, quick amounts, full-bin guard.
- Collection queue sorted by urgency, with collect and inspect actions.
- Pantry leaderboard (7d), level breakdown (7d, follows selected bin), pantry watch (avg caddy, 7d collections, quiet pantries).
- Monthly repurposed chart, building leaderboard (all time), recent activity feed.
- Deep links: `?bin=bin-scis` from scanner/cleaner.
- Shared localStorage; drops from the cleaner app appear live in the same tab or a second tab.
- **Added in redesign:** Collection trend chart (7d/30d/term), Grounds AI operational insight, marketplace link, unified SMU key-facts strip.

### Cleaner check-in — `/cleaner`

- Camera QR scanning with `BarcodeDetector` where supported.
- Four demo passes with QR images; printable passes link.
- Pass-presenting and verified states; opens the pantry picker.
- Fallback message when the camera is unavailable.

### Pantry picker — `/cleaner/building?cleaner=…`

- Requires a verified pass; otherwise shows “scan your pass first”.
- Campus map with selectable pins + building list.
- Per-building pantry levels with “emptied 5m ago” / “no record”.
- Nearly-full warning; mobile bottom sheet and desktop side panel.
- Confirm → weigh station.

### Weigh station — `/cleaner/weigh?cleaner=…&bin=…&level=…`

- Simulated overhead camera: aligning → locked → captured → demo OCR → saved.
- LCD crop/zoom inset, live badge, capture shutter, OCR status steps and elapsed time.
- Saves cleaner, pantry, before/after totals, source and scale frame to the audit trail.
- Saved state with delta, OCR timing, dashboard/deep-link and “log another pantry”.
- Rejected reading, retry, reference fallback, and bin-too-full → swap/collect states. A “Demo states” panel can trigger OCR failure and a stale reading so the recovery paths are demonstrable.
- Requires a valid cleaner, bin and level.

### Printable passes — `/passes`

- Four printable staff pass cards with QR codes, shift, vendor and pass number.
- Print action; link back to cleaner check-in.

### Grounds to Glow kiosk — `/kiosk`

- Welcome: OCIS story, four-step process, four scrub benefits.
- Check-in: name or simulated SMU ID scan.
- Guide: QR code to the AI guide, scan animation, chat modal, and “make your own scrub”.
- Recipe: four safety warnings, preparation/finishing steps, Gentle/Standard/Moisturising selector, ingredient amounts, dispense action, usage and storage instructions.
- Dispensing progress screen.
- Thanks screen with restart.
- `/kiosk?chat=1`: full-screen mobile chat with built-in guidance, suggested questions, four-question skincare quiz, recommendation card and “not recommended” safety path.

## Design parity

Every surface uses `docs/DESIGN.md` tokens:

- Oswald display / Libre Franklin body; `#8A704C` gold, `#141B4D` navy, `#E8E2DA` limestone.
- 4px core radii; 8px only for AI cards/chat; 16px only for AI prompt/bubbles.
- Standard buttons are Libre Franklin 600 sentence case; only the hero uses the Oswald uppercase CTA.
- SMU two-plane header on the marketing site; compact navy cleaner/kiosk shells use the same palette, type and angular motifs.
- No new colours, no glassmorphism, no pill primary buttons.

## Known substitutions

The only behavioural substitutions are backend services that cannot run in a static Vite demo:
PaddleOCR, the in-memory readings API and the kiosk’s external chat function. Their UI,
data flow and fallback behaviour are preserved; the replacement is visibly labelled in the
UI. If the real services are required, `src/lib/demo-ocr.ts` is the single seam for the OCR
implementation, and `KioskChat` is the single seam for the kiosk AI.
