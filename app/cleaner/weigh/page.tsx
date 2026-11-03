import { Suspense } from "react";
import { WeighStation } from "@/components/cleaner/WeighStation";

export const metadata = { title: "Weigh bin" };

export default function WeighPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-smu-cream" />}>
      <WeighStation />
    </Suspense>
  );
}
