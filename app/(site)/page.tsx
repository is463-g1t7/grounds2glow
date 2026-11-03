"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Coffee,
  Leaf,
  MapPin,
  Recycle,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { HeroCarousel } from "@/components/smu/hero-carousel";
import { SectionHeading } from "@/components/smu/page-chrome";
import { useBootstrap } from "@/lib/client/use-bootstrap";

const loop = [
  {
    title: "Capture every drop",
    text: "Smart bins weigh each drop-off and send it to the live dashboard, so nothing goes unrecorded.",
    image: "/images/coffee-machine.jpg",
    href: "/dashboard",
  },
  {
    title: "Match every batch",
    text: "The marketplace connects fresh batches with gardeners, researchers and makers who can use them.",
    image: "/images/coffee-beans.jpg",
    href: "/marketplace",
  },
  {
    title: "Prove every kilogram",
    text: "Diversion, CO₂e avoided and monthly reporting — evidence that the loop is working.",
    image: "/images/garden.jpg",
    href: "/dashboard#impact",
  },
];

const roles = [
  { label: "For pantry staff", href: "/dashboard" },
  { label: "For gardeners & makers", href: "/marketplace" },
  { label: "For campus partners", href: "/#partners" },
];

const socials = [
  "/images/coffee-cup.jpg",
  "/images/programme-intro.jpg",
  "/images/garden.jpg",
  "/images/cafe.jpg",
  "/images/research-asia.webp",
  "/images/coffee-beans.jpg",
];

const nextSteps = [
  {
    title: "Log a drop-off",
    text: "Pantry champions can record a collection in under a minute.",
    image: "/images/coffee-machine.jpg",
    href: "/dashboard",
  },
  {
    title: "Claim grounds",
    text: "Browse fresh batches across campus and reserve what you need.",
    image: "/images/garden.jpg",
    href: "/marketplace",
  },
  {
    title: "Visit the kiosk",
    text: "See how spent grounds become a Grounds to Glow coffee scrub.",
    image: "/images/coffee-cup.jpg",
    href: "/kiosk",
  },
];

const metricIcons = [Coffee, Leaf, Recycle, Users];

function formatDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Home() {
  const { data } = useBootstrap();
  const { news, programmeEvents, metrics } = data;
  const pantryLevels = data.bins.reduce((sum, bin) => sum + bin.levels, 0);
  const aboutStats = [
    { key: "diverted", label: "kept from incineration" },
    { key: "co2", label: "CO₂e avoided" },
    { key: "collected", label: "diverted since launch" },
    { key: "pantries", label: "pantries connected" },
  ].map(({ key, label }) => [metrics.find((metric) => metric.key === key)?.value ?? "—", label]);

  return (
    <>
      <HeroCarousel pantryLevels={pantryLevels} />

      <section id="programme" className="section-pad scroll-mt-[100px] bg-smu-cream">
        <div className="container-smu">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <img
                src="/images/programme-intro.jpg"
                alt="SMU students in a classroom, one raising a hand"
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="lg:col-span-7">
              <p className="text-[16px] font-bold leading-6 text-black">The programme</p>
              <h2 className="display-h2 mt-3 max-w-xl text-black">
                From pantry to purpose
              </h2>
              <p className="mt-4 max-w-xl text-[20px] leading-[30px] text-black">
                SMU&apos;s pantries serve thousands of cups every week. The Circular Coffee programme
                gives the grounds a second life — as compost for campus gardens, material for
                student projects and products for the SMU community.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/marketplace" className="btn-smu btn-smu-outline">
                  Find a drop-off point <span aria-hidden="true">»</span>
                </Link>
                <Link href="/dashboard" className="btn-smu btn-smu-outline">
                  How it works <span aria-hidden="true">»</span>
                </Link>
              </div>

              <div className="mt-9 flex flex-col gap-3 bg-smu-gold p-4 md:flex-row md:items-center">
                <p className="max-w-[180px] text-[13px] font-semibold leading-5 text-white/90">
                  Explore the loop by role
                </p>
                <div className="grid flex-1 gap-2 sm:grid-cols-3">
                  {roles.map((role) => (
                    <Link
                      key={role.label}
                      href={role.href}
                      className="group flex items-center justify-between gap-2 border border-white/85 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white hover:text-smu-gold"
                    >
                      {role.label}
                      <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                        »
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad bg-smu-cream pt-4">
        <div className="container-smu">
          <SectionHeading
            eyebrow="The circular loop"
            title="Turning waste into value"
            lead={`Three connected products keep the loop honest: capture, match and prove. Each one is live across the ${pantryLevels} pantry levels on campus.`}
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {loop.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group card-lift block overflow-hidden rounded-md bg-white"
              >
                <img
                  src={item.image}
                  alt=""
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div className="flex items-center justify-between gap-4 border-t border-black/5 p-5">
                  <div>
                    <h3 className="text-[18px] font-semibold leading-6 text-smu-navy">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-5 text-smu-muted">{item.text}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-smu-gold transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/dashboard" className="btn-smu btn-smu-gold">
              Explore the live dashboard <span aria-hidden="true">»</span>
            </Link>
          </div>
        </div>
      </section>

      <section id="impact" className="section-pad scroll-mt-[100px] bg-smu-navy text-white">
        <div className="container-smu grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="text-[16px] font-bold leading-6 text-white/75">Live impact</p>
            <h2 className="display-h2 mt-3 text-white">Impact you can measure</h2>
            <p className="mt-4 max-w-lg text-[20px] leading-[30px] text-white/80">
              Every kilogram is weighed, traced and converted into a verified environmental
              saving. The numbers update as the campus drinks its coffee.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard#impact" className="btn-smu btn-smu-gold">
                Open impact report <span aria-hidden="true">»</span>
              </Link>
              <Link href="/marketplace" className="btn-smu btn-smu-light">
                Find a batch <span aria-hidden="true">»</span>
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-[12px] text-white/45">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-smu-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-smu-success" />
              </span>
              Live telemetry · last synced 2 minutes ago
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-white/15 lg:col-span-7">
            {metrics.map((metric, i) => {
              const Icon = metricIcons[i % metricIcons.length];
              return (
                <div key={metric.key} className="bg-smu-navy p-6 md:p-8">
                  <Icon className="h-5 w-5 text-smu-gold-light" />
                  <p className="mt-4 font-display text-[36px] leading-10 text-white">{metric.value}</p>
                  <p className="mt-1 text-[13px] font-semibold uppercase tracking-[1.1px] text-white/55">
                    {metric.label}
                  </p>
                  <p className="mt-1 text-[12px] text-smu-gold-light">{metric.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="news" className="section-pad scroll-mt-[100px] bg-smu-cream">
        <div className="container-smu">
          <SectionHeading
            eyebrow="News & highlights"
            title="Keep up with the loop"
            lead="Stories, results and the people making a circular campus feel normal."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {news.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group card-lift flex flex-col overflow-hidden rounded-md bg-white shadow-card"
              >
                <img
                  src={item.image}
                  alt=""
                  className="aspect-[16/10] w-full object-cover"
                  loading="lazy"
                />
                <div className="flex flex-1 flex-col p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[1.2px] text-smu-gold">
                    {item.tag}
                  </p>
                  <h3 className="mt-2 text-[16.5px] font-semibold leading-[23px] text-smu-navy transition-colors group-hover:text-smu-gold">
                    {item.title}
                  </h3>
                  <div className="mt-auto flex items-center justify-between border-t border-black/10 pt-3 text-[13px] text-smu-muted">
                    <span>{formatDate(item.publishedAt)}</span>
                    <ArrowRight className="h-4 w-4 text-smu-gold transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/#news" className="btn-smu btn-smu-outline">
              Browse all articles <span aria-hidden="true">»</span>
            </Link>
            <a href="mailto:enquiry@smu.edu.sg?subject=Circular%20Coffee%20updates" className="btn-smu btn-smu-gold">
              Subscribe to the update <span aria-hidden="true">»</span>
            </a>
          </div>
        </div>
      </section>

      <section id="partners" className="scroll-mt-[100px] bg-smu-cream pb-20">
        <div className="container-smu">
          <div className="grid overflow-hidden bg-smu-navy text-white lg:grid-cols-2">
            <div className="p-7 md:p-10 lg:p-12">
              <p className="text-[16px] font-bold leading-6 text-white/70">Campus & industry partnerships</p>
              <h2 className="display-h3 mt-3 max-w-md text-white">
                Bridging campus and community
              </h2>
              <p className="mt-4 max-w-lg text-[16px] leading-6 text-white/70">
                We work with campus gardeners, coffee vendors, student clubs and circular-economy
                partners to turn a waste stream into a shared resource. Bring us a use case and
                we&apos;ll help you test it on campus.
              </p>
              <a href="mailto:enquiry@smu.edu.sg?subject=Circular%20Coffee%20partnership" className="btn-smu btn-smu-light mt-6">
                Become a partner <span aria-hidden="true">»</span>
              </a>
            </div>
            <div className="min-h-[280px] lg:min-h-full">
              <img
                src="/images/partnerships.jpg"
                alt="SMU staff walking through the campus with partners"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        id="about"
        className="relative scroll-mt-[100px] overflow-hidden bg-smu-gold text-white"
      >
        <div className="container-smu grid lg:grid-cols-12">
          <div className="py-16 lg:col-span-6 lg:py-20 lg:pr-12">
            <p className="text-[16px] font-bold leading-6 text-white">About the programme</p>
            <h2 className="display-h2 mt-3 max-w-xl text-white">
              A campus that wastes less
            </h2>
            <p className="mt-4 max-w-xl text-[20px] leading-[30px] text-white/80">
              Run by the Office of Campus Infrastructure and Services with students, staff and
              partners, Circular Coffee is a living lab for the circular economy. We measure
              everything, share what works and keep the loop moving.
            </p>
            <Link href="/#programme" className="btn-smu btn-smu-light mt-6">
              Read our story <span aria-hidden="true">»</span>
            </Link>

            <div className="mt-9 grid grid-cols-2 gap-6 border-t border-white/20 pt-6">
              {aboutStats.map(([value, label]) => (
                <div key={label}>
                  <p className="font-display text-[28px] leading-8 text-white">{value}</p>
                  <p className="mt-1 text-[11.5px] uppercase tracking-[1px] text-white">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 flex items-center gap-2 text-[12px] text-white">
              <TrendingUp className="h-4 w-4 text-smu-gold-light" />
              Verified against the OCIS monthly report.
            </p>
          </div>

          <div className="relative mt-2 min-h-[320px] lg:col-span-6 lg:mt-0 lg:min-h-[540px]">
            <img
              src="/images/about-grad.jpg"
              alt="SMU graduands celebrating outside the campus"
              className="absolute inset-0 h-full w-full object-cover lg:[clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-smu-gold via-transparent to-transparent lg:[clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]" />
          </div>
        </div>
      </section>

      <section id="events" className="section-pad scroll-mt-[100px] bg-smu-cream">
        <div className="container-smu">
          <SectionHeading
            eyebrow="Events"
            title="Explore what's ahead"
            lead="Drop in, get your hands dirty and meet the people closing the loop."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {programmeEvents.map((event) => (
              <article key={event.id} className="card-lift flex flex-col overflow-hidden rounded-md bg-white shadow-card">
                <img
                  src={event.image}
                  alt=""
                  className="aspect-[16/9] w-full object-cover"
                  loading="lazy"
                />
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[12px] font-semibold uppercase tracking-[1px] text-smu-gold">
                    {formatDate(event.eventDate)}
                  </p>
                  <h3 className="mt-2 font-display text-[24px] leading-8 text-smu-navy">
                    {event.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-5 text-smu-muted">{event.description}</p>
                  <p className="mt-4 flex items-center gap-1.5 text-[12px] text-smu-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.venue}
                  </p>
                  <a
                    href={`mailto:enquiry@smu.edu.sg?subject=${encodeURIComponent(event.title)}`}
                    className="text-link mt-4 border-t border-black/10 pt-3 text-[13px]"
                  >
                    Event details <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/#events" className="btn-smu btn-smu-outline">
              Browse all events <span aria-hidden="true">»</span>
            </Link>
            <Link href="/dashboard" className="btn-smu btn-smu-gold">
              Explore the calendar <span aria-hidden="true">»</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-smu-cream pb-20">
        <div className="container-smu">
          <SectionHeading eyebrow="SMU on socials" title="#sgsmu" />
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {socials.map((image, i) => (
              <a
                key={image}
                href="https://www.instagram.com/sgsmu"
                target="_blank"
                rel="noreferrer"
                className="group relative overflow-hidden"
                aria-label={`SMU on Instagram, photo ${i + 1}`}
              >
                <img
                  src={image}
                  alt=""
                  className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-smu-navy/0 transition-colors group-hover:bg-smu-navy/50">
                  <span className="font-display text-[13px] uppercase tracking-[2px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    View
                  </span>
                </span>
              </a>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a
              href="https://www.instagram.com/sgsmu"
              target="_blank"
              rel="noreferrer"
              className="btn-smu btn-smu-outline"
            >
              Follow the loop <span aria-hidden="true">»</span>
            </a>
          </div>
        </div>
      </section>

      <section className="bg-smu-cream pb-24">
        <div className="container-smu">
          <SectionHeading eyebrow="Continue your journey" title="Take the next step" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {nextSteps.map((step) => (
              <Link
                key={step.title}
                href={step.href}
                className="group relative block overflow-hidden"
              >
                <img
                  src={step.image}
                  alt=""
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-smu-navy-deep/90 via-smu-navy-deep/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <h3 className="font-display text-[24px] leading-8">{step.title}</h3>
                  <p className="mt-1 max-w-xs text-[13px] leading-5 text-white/75">{step.text}</p>
                  <span className="mt-3 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[1px] text-smu-gold-light">
                    Get started <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-12 border-t border-black/10 pt-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[16px] font-bold leading-6 text-smu-muted">Programme tools</p>
                <p className="mt-1 text-[14px] text-smu-muted">
                  The operational surfaces behind the loop — all built into this prototype.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["Cleaner app", "/cleaner"],
                  ["Scale scanner", "/scan"],
                  ["OCR reader", "/ocr"],
                  ["Staff passes", "/passes"],
                  ["Grounds to Glow kiosk", "/kiosk"],
                ].map(([label, href]) => (
                  <Link key={label} href={href} className="btn-smu btn-smu-outline btn-smu-sm">
                    {label} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-smu-cream">
        <div className="container-smu flex flex-wrap items-center justify-between gap-4 border-t border-black/10 py-6 text-[12px] text-smu-muted">
          <p className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-smu-gold" />
            A student-built prototype for the SMU Circular Coffee programme.
          </p>
          <Link href="/kiosk" className="text-link text-[12px]">
            Visit Grounds to Glow <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </>
  );
}
