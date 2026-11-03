import { Suspense } from "react";
import type { Metadata } from "next";
import { Assistant } from "@/components/assistant/AssistantClient";

export const metadata: Metadata = { title: "Grounds AI | SMU Circular Coffee" };

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-smu-cream" />}>
      <Assistant />
    </Suspense>
  );
}
