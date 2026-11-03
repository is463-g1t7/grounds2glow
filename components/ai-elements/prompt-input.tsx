"use client";

import { ArrowUp, Paperclip, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Based on shadcn/ui AI Elements Prompt Input: https://ui.shadcn.com/docs/ai-elements/base/prompt-input */
export function PromptInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Ask about your coffee scrub…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={cn(
        "overflow-hidden rounded-2xl border border-black/15 bg-white transition-colors focus-within:border-smu-gold/70",
        className
      )}
    >
      <label htmlFor="kiosk-chat-input" className="sr-only">
        Message Grounds to Glow
      </label>
      <textarea
        id="kiosk-chat-input"
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder}
        className="block max-h-40 min-h-[64px] w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[15px] leading-6 text-black placeholder:text-black/40 focus:outline-none"
      />
      <div className="flex items-center gap-2 px-3 pb-3 pt-1">
        <button
          type="button"
          aria-label="Attach a file (demo only)"
          className="rounded-full p-1.5 text-smu-muted transition-colors hover:bg-black/5 hover:text-smu-navy"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-1 text-[12px] font-medium text-smu-muted">
          <Sparkles className="h-3 w-3 text-smu-gold" />
          GLM 5.3 Flash
        </span>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-smu-navy text-white transition-colors hover:bg-smu-navy-soft disabled:cursor-not-allowed disabled:bg-black/15"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
