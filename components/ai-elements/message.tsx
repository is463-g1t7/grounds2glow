"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Based on shadcn/ui AI Elements Message: https://ui.shadcn.com/docs/ai-elements/base/message */
export function Message({
  from,
  children,
  className,
}: {
  from: "user" | "assistant";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group flex w-full gap-3",
        from === "user" ? "flex-row-reverse" : "flex-row",
        className
      )}
      data-role={from}
    >
      {children}
    </div>
  );
}

export function MessageAvatar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-smu-gold/15 text-[13px] font-semibold text-smu-gold",
        className
      )}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

export function MessageContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-2", className)}>{children}</div>;
}

export function MessageActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5 text-smu-muted", className)}>{children}</div>
  );
}

export function MessageAction({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded p-1.5 transition-colors hover:bg-black/5 hover:text-smu-navy"
    >
      {children}
    </button>
  );
}
