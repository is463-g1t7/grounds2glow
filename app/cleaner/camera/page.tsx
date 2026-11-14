import { Suspense } from "react";
import { PhoneCamera } from "@/components/cleaner/phone-camera";

export const metadata = { title: "Scale camera" };

export default function CameraPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-smu-navy-deep" />}>
      <PhoneCamera />
    </Suspense>
  );
}
