import { Suspense } from "react";
import { BuildingPicker } from "@/components/cleaner/BuildingPicker";

export const metadata = { title: "Pick pantry" };

export default function BuildingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-smu-cream" />}>
      <BuildingPicker />
    </Suspense>
  );
}
