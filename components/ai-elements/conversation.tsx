"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Conversation surface, based on the shadcn/ui AI Elements Chat pattern:
 * https://ui.shadcn.com/docs/ai-elements/base/chat
 */
export function Conversation({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("relative flex flex-1 flex-col overflow-y-auto", className)}
      role="log"
      aria-live="polite"
      aria-label="Conversation"
    >
      {children}
    </div>
  );
}

export function ConversationContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-3xl px-4 py-8 md:px-6", className)}>{children}</div>;
}

export function ConversationEmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      {icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-smu-gold/12 text-smu-gold">
          {icon}
        </div>
      )}
      <h2 className="font-display text-[30px] leading-9 text-smu-navy">{title}</h2>
      <p className="mt-2 max-w-md text-[15px] leading-6 text-smu-muted">{description}</p>
      {children && <div className="mt-6 w-full max-w-2xl">{children}</div>}
    </div>
  );
}
