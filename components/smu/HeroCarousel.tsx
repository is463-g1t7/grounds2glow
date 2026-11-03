"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const buildSlides = (pantryLevels: number) => [
  {
    image: "/images/hero.jpg",
    title: "Grounds for Change",
    body: "SMU's campus circular coffee programme turns spent coffee grounds into compost, garden nourishment and new products — tracked from pantry to purpose.",
    cta: "Explore the dashboard",
    href: "/dashboard",
  },
  {
    image: "/images/cafe.jpg",
    title: "Every gram, accounted for",
    body: `Smart bins across ${pantryLevels} campus pantry levels log each drop-off in real time. See exactly how much is diverted from incineration — and where it goes next.`,
    cta: "View live impact",
    href: "/dashboard#impact",
  },
  {
    image: "/images/garden.jpg",
    title: "Good grounds, new ground",
    body: "Claim fresh grounds for your garden, classroom or workshop. Every batch is weighed, listed and ready for its next purpose.",
    cta: "Browse the marketplace",
    href: "/marketplace",
  },
];

export function HeroCarousel({ pantryLevels }: { pantryLevels: number }) {
  const slides = buildSlides(pantryLevels);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), 8000);
    return () => window.clearInterval(id);
  }, [paused, slides.length]);

  const slide = slides[index];

  return (
    <section
      className="relative h-[620px] overflow-hidden bg-smu-navy-deep text-white md:h-[540px]"
      aria-roledescription="carousel"
      aria-label="SMU Circular Coffee highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <div
          key={s.image}
          aria-hidden={i !== index}
          className={cn(
            "absolute inset-0 bg-cover bg-center transition-opacity duration-1000",
            i === index ? "opacity-100" : "opacity-0"
          )}
          style={{ backgroundImage: `url('${s.image}')` }}
        />
      ))}
      <div className="hero-shade absolute inset-0" />

      <div className="container-smu relative flex h-full items-end pb-20 md:pb-[88px]">
        <div key={index} className="fade-up max-w-[780px]">
          <p className="eyebrow mb-3 text-white/75">SMU Circular Coffee</p>
          <h1 className="display-h1 text-white">{slide.title}</h1>
          <p className="mt-4 max-w-[700px] text-[20px] leading-[30px] text-white/90">
            {slide.body}
          </p>
          <Link href={slide.href} className="cta cta-gold cta-sm mt-6">
            {slide.cta}
            <span aria-hidden="true">»</span>
          </Link>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-7 flex items-center justify-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show slide ${i + 1}: ${s.title}`}
            aria-current={i === index}
            className={cn(
              "h-[3px] w-8 transition-colors",
              i === index ? "bg-white" : "bg-white/45 hover:bg-white/70"
            )}
          />
        ))}
      </div>

      <Link href="/#programme"
        className="absolute bottom-7 right-6 hidden items-center gap-2 text-[13px] uppercase tracking-[1.5px] text-white/70 transition-colors hover:text-white lg:flex"
      >
        Scroll to explore
        <ArrowRight className="h-4 w-4 rotate-90" />
      </Link>
    </section>
  );
}
