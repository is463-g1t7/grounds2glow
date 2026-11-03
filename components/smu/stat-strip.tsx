"use client";

import { Coffee, Droplets, Leaf, PackageCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = { gold: Coffee, navy: PackageCheck, success: Leaf } as const;

export function StatStrip({
  stats,
  className,
}: {
  stats: { value: string; label: string; detail?: string; tone?: "gold" | "navy" | "success" }[];
  className?: string;
}) {
  return (
    <section className={cn("bg-smu-navy text-white", className)}>
      <div className="container-smu">
        <dl className="grid grid-cols-2 divide-white/15 py-8 md:grid-cols-4 md:divide-x">
          {stats.map((stat, i) => {
            const Icon = icons[stat.tone ?? "gold"] ?? Droplets;
            return (
              <div
                key={stat.label}
                className={cn(
                  "flex items-start gap-4 px-2 py-4 md:px-7 md:py-0",
                  i < 2 && "border-b border-white/15 md:border-b-0",
                  i % 2 === 0 && "border-r border-white/15 md:border-r-0"
                )}
              >
                <Icon className="mt-1 h-6 w-6 shrink-0 text-smu-gold-light" strokeWidth={1.6} />
                <div>
                  <dt className="text-[13px] font-semibold uppercase leading-5 tracking-[1.2px] text-white/65">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 font-display text-[30px] leading-9 text-white">{stat.value}</dd>
                  {stat.detail && (
                    <p className="mt-0.5 text-[12px] leading-4 text-white/50">{stat.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
