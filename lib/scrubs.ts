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
