import { Suspense } from "react";
import { WeighStation } from "@/components/cleaner/weigh-station";

export const metadata = { title: "Weigh the bin" };

export default function WeighPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-smu-cream" />}>
      <WeighStation />
    </Suspense>
  );
}
