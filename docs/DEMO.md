# Cleaner flow: demo recording script

A narrated walkthrough of the cleaner flow, from scanning a staff pass to signing out. It runs
about **1 min 2 s**, and each spoken line fits the time its action takes.

## Before you record

1. Start the app with `bun run dev`.
2. Open `/demo/cleaner?station=bin-lib&scale=g` and allow the camera. This sets the laptop to the
   LKS bin and shows the Demo pill in the header. (To record the live station instead, use `/cleaner` and a
   real scale; the steps below need the sample photo, so they are demo-only.)
3. Wait on that page so the OCR service wakes up. The check-in page starts the warm-up call on
   mount; a cold start can take up to two minutes and would hold up step 8.
4. Open `/passes` on a phone and show Siti Rahmah's pass. Any other pass greets that person
   instead of Siti.

## Script

| # | Time | Length | Do on screen | Say |
|---|---|---|---|---|
| 1 | 0:00–0:06 | 6 s | Check-in page is open, camera live. Don't touch anything. | "This laptop sits at the building's central bin. The camera is already on." |
| 2 | 0:06–0:12 | 6 s | Hold the staff pass up, barcode inside the gold box. | "A cleaner holds up their staff pass, and the barcode signs them in." |
| 3 | 0:12–0:14 | 2 s | "Hi, Siti" appears, and the page moves on by itself. | "Verified. No password needed." |
| 4 | 0:14–0:22 | 8 s | Pantry page loads. Move the mouse to the pin marked "You are here". | "The laptop knows its building, so the map already marks where we are, and the bin is empty." |
| 5 | 0:22–0:27 | 5 s | Move the mouse slowly across the level buttons. | "Each level shows when its pantry last dropped off grounds." |
| 6 | 0:27–0:31 | 4 s | Click **Level 2**. | "These came from Level 2, so one click." |
| 7 | 0:31–0:40 | 9 s | Weigh page loads. Move the mouse over the waiting panel. | "The bin goes on the scale. In this demo, the station reads a sample photo of the display." |
| 8 | 0:40–0:46 | 6 s | Click **Read the sample photo**, then wait. | "Reading the scale: find the display, capture it, read the digits, and log it." |
| 9 | 0:46–0:53 | 7 s | Saved screen appears by itself. Point down the From, Bin now, By and How rows. | "Logged automatically: the amount, the pantry, who made it, and how it was read, all on one audit record." |
| 10 | 0:53–0:59 | 6 s | Point at **Log another level**, then click **Done, sign out** as you finish speaking. | "Another level, or done. Signing out hands the station to the next cleaner." |
| 11 | 0:59–1:02 | 3 s | Check-in page is back and the camera restarts by itself. | "Ready for the next drop-off." |

## The phone camera is live-only

The demo station never uses a paired phone and has no pairing links, even if a phone is still paired
from the live station, so the script above always runs the same way. To show the phone camera, use
the live station at `/cleaner` with a real scale: pair on the laptop at `/cleaner/pair`, open
`/cleaner/camera` on the phone, and clicking **Level 2** makes the phone count down from 3, take the
photo and read it. The laptop then shows the photo and saves the reading by itself.

## Good to know

- **Each take saves a real reading.** Step 8 writes 129 g to the shared database as soon as the
  photo is read. On an empty bin the sample photo is read by OCR. If the bin already holds
  grounds, the sample adds its 129 g on top (the display shows the new total), so you can run it
  as many times as you like until the bin is full. To start over, press **Collect** on LKS in the
  dashboard.
- **Everything on `/demo/*` is labelled.** The header shows a Demo pill, and readings are saved as
  "Demo reading", not "Read from the photo". Practise only as far as step 7 if you can.
- **The Menu button is on every page,** including the station screens, so you can jump to the
  dashboard from the weigh page. Open the dashboard afterwards to show the new reading and, if the
  kiosk was used, the "Coffee scrubs dispensed" section.
- **The display says 0.129 but the screen says 129 g.** They are the same weight.
- **If OCR is slow in step 8,** stay quiet and trim the wait when editing.
- **Timings are estimates** at about 2.5 spoken words per second, so do one practice run with a
  stopwatch.
