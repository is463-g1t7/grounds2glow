import type { ReactNode, RefObject } from "react";
import { Barcode } from "lucide-react";
import { SCAN_GUIDE } from "@/lib/client/use-barcode-scanner";

/** Live camera preview with the box the barcode goes in. `children` shows while the camera is off. */
export function BarcodeViewfinder({
  videoRef,
  status,
  mirrored,
  showScanLine,
  children,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: "idle" | "starting" | "scanning";
  mirrored: boolean;
  showScanLine: boolean;
  children?: ReactNode;
}) {
  const live = status !== "idle";
  return (
    <div className="relative overflow-hidden bg-smu-navy-deep">
      <video
        ref={videoRef}
        playsInline
        muted
        className={`block h-auto w-full ${mirrored ? "-scale-x-100" : ""} ${live ? "" : "hidden"}`}
      />

      {status === "scanning" && (
        <div
          className="pointer-events-none absolute rounded border-2 border-smu-gold shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
          style={{
            left: `${SCAN_GUIDE.x * 100}%`,
            top: `${SCAN_GUIDE.y * 100}%`,
            width: `${SCAN_GUIDE.width * 100}%`,
            height: `${SCAN_GUIDE.height * 100}%`,
          }}
        >
          {showScanLine && (
            <span className="scanline absolute inset-x-2 h-0.5 bg-smu-gold shadow-[0_0_12px_2px_rgba(138,112,76,0.7)]" />
          )}
        </div>
      )}

      {!live && children}
    </div>
  );
}

export function CameraOffPlaceholder() {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 p-6 text-center">
      <Barcode className="h-10 w-10 text-white/30" />
      <p className="text-[13px] text-white/60">Your camera stays off until you open it</p>
    </div>
  );
}

export function ScanTips() {
  return (
    <ul className="mt-1 list-disc pl-5">
      <li>If it&apos;s blurry, move the card further from the camera.</li>
      <li>If there&apos;s a bright patch on the barcode, tilt the card to remove it.</li>
      <li>Keep the barcode level and fully inside the box.</li>
    </ul>
  );
}
