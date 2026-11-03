"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Based on shadcn/ui AI Elements Suggestion: https://ui.shadcn.com/docs/ai-elements/base/suggestion */
export function Suggestions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>;
}

export function Suggestion({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-smu-gold/35 bg-white/70 px-3 py-1.5 text-left text-[12.5px] font-medium leading-5 text-smu-navy transition-colors hover:border-smu-gold hover:bg-smu-gold/10",
        className
      )}
    >
      <Sparkles className="h-3 w-3 shrink-0 text-smu-gold" />
      {children}
    </button>
  );
}
