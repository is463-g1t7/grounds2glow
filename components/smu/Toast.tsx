"use client";

import { CheckCircle2, Info, X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Toast({
  message,
  onClose,
  tone = "success",
}: {
  message: string;
  onClose: () => void;
  tone?: "success" | "info";
}) {
  useEffect(() => {
    const id = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(id);
  }, [message, onClose]);

  return (
    <div
      role="status"
      className={cn(
        "fade-up fixed bottom-6 right-5 z-[120] flex max-w-[380px] items-start gap-3 rounded border border-white/10 border-l-4 border-l-smu-gold bg-smu-navy px-5 py-4 text-white shadow-lift",
        tone === "success" ? "border-smu-gold/40" : "border-white/20"
      )}
    >
      {tone === "success" ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-smu-gold-light" />
      ) : (
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-smu-gold-light" />
      )}
      <p className="text-[14px] leading-5 text-white/90">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="ml-1 rounded p-0.5 text-white/60 transition-colors hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
