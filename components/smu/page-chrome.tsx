"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

export function PageHeader({
  title,
  lead,
  crumbs,
  actions,
  className,
}: {
  title: string;
  lead: string;
  crumbs: Crumb[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-smu-cream pb-12 pt-[140px] md:pb-14 md:pt-[160px]", className)}>
      <div className="container-smu">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-smu-muted">
            {crumbs.map((crumb, i) => (
              <li key={crumb.label} className="flex items-center gap-1.5">
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-smu-gold">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
                {i < crumbs.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-black/35" aria-hidden="true" />
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <h1 className="display-h1 font-normal text-black">{title}</h1>
            <p className="mt-4 max-w-2xl text-[18px] leading-7 text-black">{lead}</p>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "center",
  tone = "dark",
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "center" | "left";
  tone?: "dark" | "light";
  className?: string;
}) {
  return (
    <div
      className={cn(
        align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl text-left",
        className
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "text-[16px] font-bold leading-6",
            tone === "light" ? "text-white/80" : "text-black"
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "display-h2 mt-3",
          tone === "light" ? "text-white" : "text-black"
        )}
      >
        {title}
      </h2>
      {lead && (
        <p
          className={cn(
            "mt-4 text-[20px] leading-[30px]",
            tone === "light" ? "text-white/80" : "text-black",
            align === "center" && "mx-auto max-w-2xl"
          )}
        >
          {lead}
        </p>
      )}
    </div>
  );
}
