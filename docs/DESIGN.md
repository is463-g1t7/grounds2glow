---
version: "alpha"
name: "SMU Institutional — Circular Coffee"
description: "The Singapore Management University corporate design language, extended for the SMU Circular Coffee platform. Tokens are measured from smu.edu.sg (November 2026)."
colors:
  primary: "#8A704C"
  primary-hover: "#69553A"
  primary-pressed: "#6E5A3D"
  secondary: "#141B4D"
  secondary-deep: "#0D1238"
  secondary-soft: "#232C6B"
  surface: "#E8E2DA"
  surface-light: "#F3EEE7"
  surface-muted: "#DCD5C9"
  surface-tab: "#F9F9F9"
  ink: "#000000"
  muted: "#555555"
  line: "#D8D0C4"
  white: "#FFFFFF"
  info: "#3860BE"
  success: "#3EB33E"
  warning: "#E6A422"
  danger: "#D93C36"
  on-primary: "#FFFFFF"
  on-secondary: "#FFFFFF"
typography:
  display-h1:
    fontFamily: Oswald
    fontSize: 48px
    fontWeight: 300
    lineHeight: 60px
  page-title:
    fontFamily: Oswald
    fontSize: 48px
    fontWeight: 400
    lineHeight: 60px
  display-h2:
    fontFamily: Oswald
    fontSize: 40px
    fontWeight: 400
    lineHeight: 50px
  display-h3:
    fontFamily: Oswald
    fontSize: 32px
    fontWeight: 400
    lineHeight: 40px
  display-h4:
    fontFamily: Oswald
    fontSize: 24px
    fontWeight: 400
    lineHeight: 32px
  eyebrow:
    fontFamily: Oswald
    fontSize: 17.6px
    fontWeight: 400
    lineHeight: 22px
    letterSpacing: 2px
  section-kicker:
    fontFamily: Libre Franklin
    fontSize: 16px
    fontWeight: 700
    lineHeight: 24px
  body:
    fontFamily: Libre Franklin
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
  body-lead:
    fontFamily: Libre Franklin
    fontSize: 20px
    fontWeight: 400
    lineHeight: 30px
  body-small:
    fontFamily: Libre Franklin
    fontSize: 14px
    fontWeight: 400
    lineHeight: 21px
  label:
    fontFamily: Libre Franklin
    fontSize: 16px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 1.6px
  menu-item:
    fontFamily: Oswald
    fontSize: 21px
    fontWeight: 400
    lineHeight: 28px
  button:
    fontFamily: Libre Franklin
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px
  button-small:
    fontFamily: Libre Franklin
    fontSize: 13.5px
    fontWeight: 600
    lineHeight: 20px
  cta-hero:
    fontFamily: Oswald
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0.01em
  ai-message:
    fontFamily: Libre Franklin
    fontSize: 14.5px
    fontWeight: 400
    lineHeight: 24px
  code:
    fontFamily: "Courier New"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 20px
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 4px
  lg: 8px
  xl: 16px
  full: 999px
spacing:
  2xs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 80px
components:
  header:
    backgroundColor: "{colors.surface-tab}"
    textColor: "{colors.ink}"
    height: 100px
    rounded: "{rounded.none}"
  header-actions:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.body}"
    height: 60px
    rounded: "{rounded.none}"
  menu-overlay:
    backgroundColor: "{colors.secondary-soft}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.menu-item}"
    padding: "{spacing.lg}"
    rounded: "{rounded.none}"
  search-overlay:
    backgroundColor: "{colors.secondary-deep}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.display-h3}"
    padding: "{spacing.2xl}"
    rounded: "{rounded.none}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    padding: "{spacing.xs} {spacing.md}"
    rounded: "{rounded.sm}"
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    padding: "{spacing.xs} {spacing.md}"
    rounded: "{rounded.sm}"
    height: 40px
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    padding: "{spacing.xs} {spacing.md}"
    rounded: "{rounded.sm}"
    height: 40px
  cta-hero:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.cta-hero}"
    padding: "{spacing.sm} {spacing.md}"
    rounded: "{rounded.sm}"
    height: 42px
  button-navy:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.button}"
    padding: "{spacing.xs} {spacing.md}"
    rounded: "{rounded.sm}"
    height: 40px
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.button-small}"
    padding: "{spacing.xs} {spacing.md}"
    rounded: "{rounded.sm}"
    height: 34px
  button-outline-light:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.button-small}"
    padding: "{spacing.xs} {spacing.md}"
    rounded: "{rounded.sm}"
    height: 34px
  section-cream:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "{spacing.4xl} {spacing.lg}"
    rounded: "{rounded.none}"
  section-navy:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.body}"
    padding: "{spacing.4xl} {spacing.lg}"
    rounded: "{rounded.none}"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "{spacing.lg}"
    rounded: "{rounded.md}"
  card-hover:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "{spacing.lg}"
    rounded: "{rounded.md}"
  filter-bar:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    padding: "{spacing.sm}"
    rounded: "{rounded.none}"
  stat-strip:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.body-small}"
    padding: "{spacing.xl} {spacing.lg}"
    rounded: "{rounded.none}"
  divider:
    backgroundColor: "{colors.line}"
    height: 1px
    width: 100%
  body-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  section-kicker:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.section-kicker}"
  muted-text:
    backgroundColor: "{colors.white}"
    textColor: "{colors.muted}"
    typography: "{typography.body-small}"
  inline-link:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
  inline-link-hover:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary-hover}"
    typography: "{typography.body}"
  badge-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    padding: "{spacing.2xs} {spacing.xs}"
    rounded: "{rounded.full}"
  badge-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.ink}"
    typography: "{typography.body-small}"
    padding: "{spacing.2xs} {spacing.xs}"
    rounded: "{rounded.full}"
  badge-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.white}"
    typography: "{typography.body-small}"
    padding: "{spacing.2xs} {spacing.xs}"
    rounded: "{rounded.full}"
  badge-info:
    backgroundColor: "{colors.info}"
    textColor: "{colors.white}"
    typography: "{typography.body-small}"
    padding: "{spacing.2xs} {spacing.xs}"
    rounded: "{rounded.full}"
  ai-message-user:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.ai-message}"
    padding: "{spacing.sm} {spacing.md}"
    rounded: "{rounded.xl}"
  ai-message-assistant:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink}"
    typography: "{typography.ai-message}"
    padding: "{spacing.md}"
    rounded: "{rounded.md}"
  ai-prompt:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "{spacing.sm}"
    rounded: "{rounded.xl}"
  ai-tool:
    backgroundColor: "{colors.white}"
    textColor: "{colors.secondary}"
    typography: "{typography.code}"
    padding: "{spacing.sm}"
    rounded: "{rounded.lg}"
  ai-source:
    backgroundColor: "{colors.white}"
    textColor: "{colors.secondary}"
    typography: "{typography.body-small}"
    padding: "{spacing.sm}"
    rounded: "{rounded.lg}"
  footer:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.body-small}"
    padding: "{spacing.2xl} {spacing.lg}"
    rounded: "{rounded.none}"
---

# SMU Institutional — Circular Coffee

## Overview

**Institutional modernism, warmed by a limestone canvas.** SMU's public site reads as
confident and civic rather than startup-bright: a condensed display face carries the
headlines, a humanist sans carries the evidence, and the palette stays within three
families — deep navy, warm limestone, and a restrained olive-gold. The result is a
university that looks established, open and precise.

The visual signature is architectural. The header is built from two skewed planes: a
white logo tab cut on a diagonal, and a navy action bar clipped with a 42px diagonal on its
left edge. Photographs
are full-bleed or hard-edged, never floaty. Cards are flat white rectangles on warm stone,
with a 4px radius at most. The only softness comes from generous whitespace and the
occasional circular scroll control or avatar.

This design system is extracted from the live `smu.edu.sg` site (November 2026) and
extended for a product surface: **SMU Circular Coffee**. The marketing surfaces use the
institution's editorial rhythm - full-bleed hero, cream section, navy proof strip, card
grids, dark partnership panel, image-led next steps. The operational pages (dashboard,
OCR/scale tools) keep the same chrome and type but tighten the density for data. The
cleaner app and Grounds to Glow kiosk drop the corporate header/footer and become focused
standalone experiences built from the same tokens.

**Current product surfaces.** The landing loop, live dashboard, cleaner check-in/building/
weigh flow, Grounds to Glow kiosk and chat, printable staff passes, and the OCR/scan demo
tools. The marketplace and news hub described in older material have been removed from the
app; keep their patterns only where a current surface still uses them.

**Design principles**

1. **Institutional calm.** One idea per band, generous vertical breathing room, no
   decorative gradients except photographic overlays.
2. **One gold action.** Gold is the interaction colour. A view should have one primary
   gold CTA; everything else is navy outline or a text link.
3. **Photography before illustration.** Real campus, real people, real grounds. Images
   carry the warmth; the interface stays quiet.
4. **Angular geometry.** Diagonal cuts, skewed planes and the triangular footer motif
   come from the SMU mark. Do not round the chrome.
5. **Proof over decoration.** Numbers are large, sourced and dated. AI answers stay within
   the kiosk materials and say when the information is not available, rather than asking
   for trust.

## Colors

The palette is small on purpose. Every colour below is either measured from the SMU
theme (`#8A704C`, `#141B4D`, `#E8E2DA`, `#3860BE`, `#3EB33E`, `#E6A422`, `#D93C36`) or a
derived tint used for surfaces and states.

- **SMU Gold (#8A704C)** — the action colour. Primary buttons, text links, active
  indicators, small caps tags and data accents. It reads brown-olive at large areas,
  which is why it can hold a full-width programme band without shouting.
- **Gold hover (#69553A)** — darkens on press and hover. Never pair gold text with gold
  backgrounds.
- **SMU Navy (#141B4D)** — the institutional anchor. Header action bar, footer, key-facts
  strip, partnership panels and all reversed sections.
- **Deep navy (#0D1238)** — 60–95% scrims, search overlay and modal backdrops.
- **Soft navy (#232C6B)** — the menu drawer and hover states on navy.
- **Limestone (#E8E2DA)** — the default page field for editorial sections. Slightly warm,
  never grey. It is the visual equivalent of the Victoria Street façade.
- **Light limestone (#F3EEE7)** and **muted limestone (#DCD5C9)** — card tints, filter
  bars and quiet AI surfaces.
- **Ink (#000000)** — body and display text on light surfaces. SMU uses true black, not
  near-black.
- **Muted (#555555)** — metadata, dates, helper text, disabled labels.
- **Line (#D8D0C4)** — 1px hairlines and table rules.
- **Signal colours** — success `#3EB33E`, warning `#E6A422`, danger `#D93C36`, info
  `#3860BE`. Use only for state, never as brand decoration.
- **White** — cards, logo tab, reversed text. Pure white against limestone is a deliberate
  material contrast.

Accessibility: gold `#8A704C` on white passes AA for normal text (4.67:1) and is safe for
buttons with white text. On limestone `#E8E2DA`, small gold text drops below AA; use
`primary-hover` for small text on cream or keep gold for ≥24px display and non-text
accents. Navy on limestone and white on navy both pass AAA.

## Typography

**Oswald** is the display voice: a condensed grotesque used for every heading, the
uppercase eyebrow, the menu, and the hero CTA label. It is always set at 300–400 weight — never
bold — and never used for running body text. Its narrow footprint is what lets SMU stack a
long programme title into two lines without crowding the photograph.

**Libre Franklin** is the evidence voice: body copy, navigation labels in the header,
tables, form labels, metadata and the footer. It is set at 400 for text and 600 for labels
and emphasis. Body line-height is a generous 1.5; lead paragraphs 1.5 at 20px.

| Role | Face | Size / line | Weight | Notes |
| --- | --- | --- | --- | --- |
| Hero | Oswald | 48 / 60 | 300 | White on photography |
| Page title | Oswald | 48 / 60 | 400 | Black on cream, breadcrumb above |
| Section title | Oswald | 40 / 50 | 400 | One per band, centred or left |
| Sub-section | Oswald | 32 / 40 | 400 | Cards, panels, dialog titles |
| Card title | Oswald | 24 / 32 | 400 | Product cards; 18px sans is allowed for dense cards |
| Eyebrow | Oswald | 17.6 / 22 | 400 | Uppercase, 2px tracking — brand/AI labels |
| Section kicker | Libre Franklin | 16 / 24 | 700 | Sentence case — above section titles |
| Lead | Libre Franklin | 20 / 30 | 400 | Hero support, section intros |
| Body | Libre Franklin | 16 / 24 | 400 | Default |
| Small | Libre Franklin | 14 / 21 | 400 | Metadata, dates, helper text |
| Label | Libre Franklin | 16 / 20 | 600 | Uppercase, 1.6px tracking — footer headings |
| Menu item | Oswald | 21 / 28 | 400 | Sentence case in the drawer |
| Standard button | Libre Franklin | 16 / 24 | 600 | Sentence case, 4px radius |
| Hero CTA | Oswald | 13 / 20 | 400 | Uppercase, shadow |
| AI message | Libre Franklin | 14.5 / 24 | 400 | Chat surfaces |
| Code | Courier New | 12 / 20 | 400 | Tool inputs and outputs |

Rules: headings use sentence case, not title case. The Oswald uppercase eyebrow is reserved
for brand and AI labels (the hero identifier, "Grounds to Glow AI", menu section labels);
editorial sections use a bold Libre Franklin kicker in sentence case above the display
heading. The hero CTA and button labels are the other uppercase exceptions, alongside the
footer headings and small status chips. Standard buttons are Libre Franklin 600 sentence
case, matching SMU's `.btn` family; only the hero uses the Oswald uppercase `.cta`
treatment. Do not add tracking to body text. Numbers in stat strips and tables should use
tabular figures where available.

## Layout

The page uses a **1400px max-width container** with 20px gutters on desktop and 16px on
mobile. Inside, a 12-column grid with 24px gaps handles editorial splits (5/7 or 6/6) and
card grids (3-up for programme cards, 4-up for impact and loop cards). Sections are
separated by **80px vertical padding** on desktop (56px on mobile), with a full-bleed band
background per section rather than cards floating on white.

**Header.** Fixed, 100px tall, transparent between its two planes so the hero shows
through. The left plane is a `#F9F9F9` logo tab, 250px wide at the top edge, cut with a
44px diagonal at the bottom-right; the SMU logo sits 24px from the left at 84px tall. The
right plane is a 330 × 60px navy bar, clipped with a 42px diagonal on its left edge, holding
`Search` and a `Menu` label with a 20 × 14px hamburger. Both labels are Libre Franklin 600
16px white. On mobile the tab narrows to 196px and the logo to 72px; the action bar becomes
an icon cluster with 24px clip.

**Page header.** Interior pages open on limestone with 140-160px top padding (to clear the
fixed header), a breadcrumb at 13px, an Oswald 48px page title, an 18px lead, and actions
right-aligned on desktop. Dashboard and tool pages share this pattern.

**Key facts strip.** A full-bleed navy band immediately under the page header with four
statistics in a 4-column grid, separated by 1px white/15 rules. Each stat has a small gold
icon, a 30px Oswald value, a 13px uppercase label and a 12px detail line. On mobile it
becomes a 2 × 2 grid.

**Footer.** Navy, 4-column grid: brand and address (4 columns), get in touch (3),
directories (2), schools (3). Headings are uppercase Libre Franklin 600 16px with 1.6px
tracking. Links are 14px white/80. The legal row and social icons sit below a white/15
rule, with the copyright beneath. The triangular footer artwork is a low-opacity background
texture, never a foreground graphic.

**Responsive.** Breakpoints: 640, 768, 1024, 1280. Split layouts stack at 1024. Card grids
go 4 → 3 → 2 → 1. The header stays 100px; only the logo and action bar compress. Tables
scroll horizontally inside their card rather than forcing the page wide. The AI chat becomes
a single column with the context panel below the conversation.

## Elevation & Depth

SMU is a flat, printed surface. There is no glassmorphism, no glow, and no soft gradient
behind content. Depth is expressed in four ways only:

1. **Tonal bands** — limestone, white, navy, gold. These do the work that shadows do in
   other systems.
2. **A single card shadow** — `0 1px 2px rgba(20,27,77,.05)`. Cards on limestone lift just
   enough to separate; SMU's own cards are almost flat, so keep this barely visible. Cards
   on white do not need it.
3. **CTA shadow** — `2px 2px 16px rgba(0,0,0,.2)` on the hero CTA only, matching SMU's
   `.cta` treatment. Standard buttons are flat.
4. **Scrims** — 60% deep navy for the menu, 95% for search, 2px blur. Overlays are flat
   colour, not gradients.

Hover states lift cards by 4px and increase the shadow; they never scale the whole card.
Photographs may scale 3–5% inside their frame on hover.

## Shapes

Radii are architectural: **4px** for buttons, inputs, cards, banners, dialogs and tables;
**8px** for AI tool/source cards and the chat container; **16px** only for AI prompt fields
and user message bubbles, where the native AI-element pattern calls for it; **full** for
avatars, status dots and filter chips.

The organising shape is the **diagonal**. It appears in the logo tab, the navy header
plane, the angled mask on the About photograph, and the triangle field in the footer. Use
45° cuts or clip paths, not rounded blobs. Do not combine a diagonal cut with a large
border radius on the same element.

## Components

**Header.** Two overlapping planes. Do not put navigation links in the header itself; SMU
uses the off-canvas menu. The logo tab is never shadowed. The header sits above the hero
with a transparent middle.

**Menu drawer.** 400px wide, full height, `#232C6B`, opening from the right. Close X at top
right. Primary items are Oswald 21px sentence case in a single column with 1px white/10
rules; the active route gets a dark tile that bleeds to the drawer edges. Groups expand
with a chevron into a left-ruled list of 15px links with 12px descriptions. A separate
"Information for" block uses an Oswald 15px uppercase tracked label and 15px links. Finish
with a gold-tinted "Ask Grounds to Glow AI" card.

**Search overlay.** Full-screen deep navy at 95%, 2px blur. A 50px Libre Franklin 200 input
with a white underline and a 34–50px placeholder; results as two columns of 1px white/10
cards with Oswald 19px titles and 14px descriptions. Hint line: "Hit enter to search or
ESC to close".

**Buttons.** One primary gold CTA per view. Standard buttons are Libre Franklin 600 16px
sentence case, 8px × 16px padding, 4px radius, 1px border, no shadow — matching SMU's
`.btn` family. Hover inverts to white with gold text and a `#BFBFBF` border. Secondary is
navy; tertiary is a 1px navy outline. Small buttons use 13.5px type and 6px × 12px padding.
The **hero CTA** is the exception: Oswald 13px uppercase with 6px × 12px padding and the
`2px 2px 16px rgba(0,0,0,.2)` shadow, matching SMU's `.cta`. Never use a pill for a
primary action.

**Cards.** White, 4px radius, no border, a barely visible 1px shadow. Image-led cards use a
16:10 image, 16px body padding, an 11px gold uppercase tag, a 16.5px semibold navy title,
and a 13px muted date/footer with a hairline above. Research/loop cards use a 4:3 image and
a label bar with an arrow. Hover lifts 4px and moves the arrow 4px right.

**Filter bar.** Full-width muted limestone (`#DCD5C9`) strip with 12px padding, containing
white inputs and selects at 13.5px, 1px black/10 borders, square corners. This is the SMU
filter-bar pattern; do not turn it into floating chips.

**Stat strip / metrics.** Navy band, four columns, 1px white/15 dividers. Values 30–36px
Oswald; labels 13px uppercase Libre Franklin 600 with 1.1px tracking; details 12px white/50.
Dashboards may place the same anatomy on white cards with a 2px gold top rule.

**Tables.** White card, 10.5px uppercase tracked header, 13–13.5px rows, 1px black/5 rules.
Fill levels use a 2px gold bar on a 10% black track. Status pills are 11px semibold with a
10% tint background and a darker text tone — never saturated blocks.

**AI elements.** Built from the shadcn/ui AI Elements patterns and re-skinned in SMU
colours. The current kiosk uses Conversation, Message, Response, Prompt Input, Suggestion
and Loader. User messages are navy bubbles with a 16px radius, white 14.5px text,
right-aligned. Assistant turns have a gold avatar and no bubble; content sits directly on the
chat surface. Reasoning, Tool, Plan and Sources patterns exist in `components/ai-elements/`
but are not rendered by the current kiosk. The prompt input is a white 16px-radius field with
a 1px black/15 border, a paperclip, a "Grounds to Glow AI" model chip and a navy circular
send button. Suggestions are gold-outlined chips, not filled buttons.

**Dialogs and toasts.** Dialogs are white 4px cards, max 520px, with a 60% deep-navy scrim
and 2px blur; titles use Oswald 32px. Toasts are navy cards with a gold left accent, 14px
white/90 text, a status icon and a close button, bottom-right, auto-dismissed after 4.5s.

**Operational surfaces.** The cleaner app is a focused mobile-first flow: a navy shell with a
gold top rule, a three-step progress bar and a cleaner chip; camera viewfinders use deep navy
with gold corner brackets, a scan line and white status text. The Grounds to Glow kiosk is a
standalone cream editorial experience with no site chrome: large Oswald welcome headline, split
navy/white check-in card, QR card, recipe and safety cards, and a navy thank-you panel. Both
surfaces reuse the same 4px cards, gold primary buttons, body type and status colours; they do
not introduce a second UI language. OCR and scale-tool pages keep the corporate header and
PageHeader, with navy camera wells and white result cards. Campus maps use the illustrated SMU
artwork, with status pins in success/warning/danger and white focus rings.

## Do's and Don'ts

**Do**

- Use one gold primary action per screen; make the rest navy or outline.
- Let limestone and navy bands create rhythm instead of shadows and gradients.
- Keep Oswald for display and Libre Franklin for reading. Never swap them.
- Use real SMU or coffee photography with hard edges and a dark navy scrim for white text.
- Keep the header two-plane geometry and the 4px core radius (8px for AI cards, 16px only
  for the AI prompt).
- Show the source, tool call and timestamp on AI answers.
- Use sentence case for headings, menu items and card titles.

**Don't**

- Don't set body copy in Oswald, or headings in bold Libre Franklin.
- Don't use gold text smaller than 24px on limestone; switch to `primary-hover`.
- Don't add new accent colours, purple gradients or glass effects.
- Don't use pill-shaped primary buttons or 20px radii on core chrome.
- Don't put drop shadows on section bands or the logo tab.
- Don't centre long paragraphs; centre only eyebrows, section titles and short leads.
- Don't invent statistics. If a number is not sourced, label it as demo data.
