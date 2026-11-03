import { Suspense } from "react";
import type { Metadata } from "next";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const metadata: Metadata = { title: "Live operations | SMU Circular Coffee" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-smu-cream" />}>
      <DashboardClient />
    </Suspense>
  );
}
