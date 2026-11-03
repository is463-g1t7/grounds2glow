import { Suspense } from "react";
import type { Metadata } from "next";
import { KioskFlow } from "@/components/kiosk/KioskFlow";

export const metadata: Metadata = {
  title: "Grounds to Glow · Coffee Scrub Station",
  description:
    "SMU coffee scrub kiosk: learn the collection loop, find your recipe, and dispense a fresh scrub.",
  robots: { index: false },
};

export default function KioskPage() {
  // KioskFlow reads ?chat=1 on the client; the Suspense boundary lets the
  // route prerender. Fallback is a plain loading state.
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3eee7]" />}>
      <KioskFlow />
    </Suspense>
  );
}
