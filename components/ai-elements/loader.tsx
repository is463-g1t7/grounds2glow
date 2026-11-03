"use client";

export function Loader() {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-smu-muted" role="status">
      <span className="sr-only">Grounds AI is thinking</span>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-smu-gold/70"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}
