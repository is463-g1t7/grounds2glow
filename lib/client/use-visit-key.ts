"use client";

import { useLayoutEffect, useState } from "react";

/**
 * Cache Components hides a page instead of unmounting it, so its state survives navigation.
 * A shared station must not show one cleaner's session to the next, so use this as a `key`:
 * it changes whenever the page is hidden, and the page starts over on the next visit.
 */
export function useVisitKey(): number {
  const [visit, setVisit] = useState(0);
  useLayoutEffect(() => () => setVisit((v) => v + 1), []);
  return visit;
}
