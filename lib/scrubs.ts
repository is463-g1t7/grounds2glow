/** The recipes the Grounds to Glow kiosk offers. The dispense API only accepts these keys. */
export const SCRUB_RECIPES = ["gentle", "standard", "moisturising"] as const;

export type ScrubRecipe = (typeof SCRUB_RECIPES)[number];

export const SCRUB_RECIPE_LABEL: Record<ScrubRecipe, string> = {
  gentle: "Gentle",
  standard: "Standard",
  moisturising: "Moisturising",
};

export function isScrubRecipe(value: unknown): value is ScrubRecipe {
  return typeof value === "string" && (SCRUB_RECIPES as readonly string[]).includes(value);
}

/**
 * Dispenses live in the existing `programme_events` table, so no schema change is needed. Each one
 * is a row with the recipe in `title`, the day in `event_date` and these two marker values.
 * Nothing else reads `programme_events`. It holds no name or ID, and only the day (not the time).
 */
export const DISPENSE_VENUE = "Grounds to Glow kiosk";
export const DISPENSE_DESCRIPTION = "Coffee scrub dispensed";

/** The kiosk's calendar day (Singapore time) as YYYY-MM-DD. */
export function singaporeDay(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}

/** A stored day as a timestamp at midday Singapore time, so it lands on the right local day. */
export function dispenseTimestamp(day: string): string {
  return new Date(`${day}T12:00:00+08:00`).toISOString();
}
