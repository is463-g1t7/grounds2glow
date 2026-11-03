"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchIndex } from "@/lib/search-index";

type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string; description?: string }[];
};

const nav: NavItem[] = [
  { label: "Overview", href: "/" },
  {
    label: "Live dashboard",
    href: "/dashboard",
    children: [
      { label: "Operations overview", href: "/dashboard", description: "Bins, collections and live telemetry" },
      { label: "Collection schedule", href: "/dashboard#pickups", description: "Upcoming campus pickups" },
      { label: "Impact report", href: "/dashboard#impact", description: "Diversion and CO₂e avoided" },
    ],
  },
  {
    label: "Marketplace",
    href: "/marketplace",
    children: [
      { label: "Browse grounds", href: "/marketplace", description: "Available batches across campus" },
      { label: "Listing guidance", href: "/marketplace#guidance", description: "How batches are weighed and stored" },
    ],
  },
  {
    label: "Tools",
    href: "/scan",
    children: [
      { label: "Scale scanner", href: "/scan", description: "Read the scale LCD and post a weight" },
      { label: "OCR reader", href: "/ocr", description: "Extract text from an image" },
      { label: "Cleaner app", href: "/cleaner", description: "Scan a pass, pick a pantry and weigh" },
      { label: "Printable passes", href: "/passes", description: "Demo staff QR cards" },
      { label: "Grounds to Glow kiosk", href: "/kiosk", description: "Coffee scrub dispensing experience" },
    ],
  },
  {
    label: "Programme",
    href: "/#programme",
    children: [
      { label: "How it works", href: "/#programme", description: "From pantry to purpose" },
      { label: "Our partners", href: "/#partners", description: "The people keeping the loop turning" },
      { label: "Latest updates", href: "/#news", description: "Stories from across campus" },
    ],
  },
  { label: "News & events", href: "/#news" },
  { label: "About", href: "/#about" },
];

const infoFor = [
  { label: "Students and alumni", href: "/marketplace" },
  { label: "Faculty and staff", href: "/dashboard" },
  { label: "Campus partners", href: "/#partners" },
  { label: "Facilities teams", href: "/cleaner" },
  { label: "Media and suppliers", href: "/#news" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hash, setHash] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    const locked = menuOpen || searchOpen;
    document.body.style.overflow = locked ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen, searchOpen]);

  useEffect(() => {
    if (menuOpen) {
      window.setTimeout(() => drawerRef.current?.focus(), 60);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) {
      window.setTimeout(() => searchRef.current?.focus(), 60);
    }
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = query.trim()
    ? searchIndex.filter((item) =>
        `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase())
      )
    : searchIndex;

  const submitSearch = () => {
    const first = results[0];
    if (first) {
      router.push(first.href);
      setSearchOpen(false);
    }
  };

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[100px]">
        <div className="pointer-events-auto absolute inset-y-0 left-0 w-[196px] bg-[#f9f9f9] [clip-path:polygon(0_0,100%_0,calc(100%-30px)_100%,0_100%)] md:w-[250px] md:[clip-path:polygon(0_0,100%_0,calc(100%-44px)_100%,0_100%)]">
          <Link href="/"
            aria-label="SMU Circular Coffee — home"
            className="ml-3 flex h-[100px] items-center md:ml-6"
          >
            <img
              src="/smu-logo.svg"
              alt="Singapore Management University"
              className="h-[72px] w-auto md:h-[84px]"
            />
          </Link>
        </div>

        <div className="pointer-events-auto absolute right-0 top-0 flex h-[56px] w-auto items-center justify-end gap-3 bg-smu-navy pl-8 pr-4 [clip-path:polygon(24px_0,100%_0,100%_100%,0_100%)] sm:gap-5 md:h-[60px] md:w-[330px] md:gap-6 md:pl-14 md:pr-7 md:[clip-path:polygon(42px_0,100%_0,100%_100%,0_100%)]">
          <div className="absolute right-0 top-0 h-full w-24 bg-white/[0.04] [clip-path:polygon(45%_0,100%_0,100%_100%,0_100%)]" />
          <button
            type="button"
            onClick={() => { setQuery(""); setSearchOpen(true); }}
            className="relative flex items-center gap-2 text-[16px] font-semibold text-white transition-colors hover:text-smu-gold-light"
            aria-label="Search"
            aria-expanded={searchOpen}
          >
            <span className="hidden sm:inline">Search</span>
            <Search className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </button>
          <span className="h-7 w-px bg-white/40" aria-hidden="true" />
          <button
            type="button"
            onClick={() => { setOpenGroup(null); setMenuOpen(true); }}
            className="relative flex items-center gap-2 text-[16px] font-semibold text-white transition-colors hover:text-smu-gold-light"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
          >
            <span className="hidden sm:inline">Menu</span>
            <span className="flex h-[14px] w-5 flex-col justify-between" aria-hidden="true">
              <span className="h-[3px] w-5 rounded-sm bg-current" />
              <span className="h-[3px] w-5 rounded-sm bg-current" />
              <span className="h-[3px] w-5 rounded-sm bg-current" />
            </span>
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label="Site menu">
          <button
            className="absolute inset-0 bg-smu-navy-deep/60 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            tabIndex={-1}
          />
          <div
            id="site-menu"
            ref={drawerRef}
            tabIndex={-1}
            className="relative flex h-full w-full max-w-[400px] flex-col overflow-y-auto bg-smu-navy-soft px-6 pb-10 pt-5 text-white shadow-2xl outline-none"
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-[15px] uppercase tracking-[2px] text-white/50">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="rounded p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-6 w-6" strokeWidth={1.5} />
              </button>
            </div>

            <nav className="mt-6" aria-label="Main navigation">
              <ul className="border-t border-white/10">
                {nav.map((item) => {
                  const base = item.href.split("#")[0];
                  const itemHash = item.href.includes("#") ? `#${item.href.split("#")[1]}` : "";
                  const active =
                    item.href === "/"
                      ? pathname === "/" && !hash
                      : pathname === base &&
                        (itemHash ? hash === itemHash : true);
                  const expanded = openGroup === item.label;
                  return (
                    <li key={item.label} className="border-b border-white/10">
                      <div
                        className={cn(
                          "flex items-center justify-between py-3.5",
                          active && "-mx-6 bg-black/25 px-6"
                        )}
                      >
                        <Link href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className="flex-1 font-display text-[21px] leading-7 tracking-[0.01em] text-white transition-colors hover:text-smu-gold-light"
                        >
                          {item.label}
                        </Link>
                        {item.children && (
                          <button
                            type="button"
                            onClick={() => setOpenGroup(expanded ? null : item.label)}
                            aria-expanded={expanded}
                            aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label}`}
                            className="rounded p-1 text-white/70 transition-colors hover:text-white"
                          >
                            <ChevronDown
                              className={cn("h-5 w-5 transition-transform", expanded && "rotate-180")}
                              strokeWidth={1.6}
                            />
                          </button>
                        )}
                      </div>
                      {item.children && expanded && (
                        <ul className="mb-4 space-y-1 border-l border-white/20 pl-4">
                          {item.children.map((child) => (
                            <li key={child.label}>
                              <Link href={child.href}
                                onClick={() => setMenuOpen(false)}
                                className="block rounded px-2 py-2 text-[15px] leading-5 text-white/75 transition-colors hover:bg-white/5 hover:text-white"
                              >
                                {child.label}
                                {child.description && (
                                  <span className="mt-0.5 block text-[12px] leading-4 text-white/70">
                                    {child.description}
                                  </span>
                                )}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="mt-8">
              <h2 className="font-display text-[15px] uppercase tracking-[2px] text-white/45">
                Information for
              </h2>
              <ul className="mt-3 space-y-1">
                {infoFor.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded px-2 py-1.5 text-[15px] text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto border-t border-white/10 pt-6">
              <Link href="/kiosk"
                onClick={() => setMenuOpen(false)}
                className="group flex items-center justify-between rounded-lg bg-smu-gold/15 p-4 transition-colors hover:bg-smu-gold/25"
              >
                <div>
                  <p className="font-display text-[17px] uppercase tracking-[1px] text-white">
                    Grounds to Glow
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-white/60">
                    Make a coffee scrub at the kiosk.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-smu-gold-light transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {searchOpen && (
        <div
          className="fixed inset-0 z-[90] bg-smu-navy-deep/95 text-white backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <div className="container-smu pt-8">
            <div className="flex items-center justify-between">
              <span className="font-display text-[15px] uppercase tracking-[2px] text-white/55">
                Search SMU Circular Coffee
              </span>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="rounded p-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-7 w-7" strokeWidth={1.4} />
              </button>
            </div>

            <div className="mt-20 md:mt-24">
              <label htmlFor="site-search" className="sr-only">
                Search the programme
              </label>
              <input
                ref={searchRef}
                id="site-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitSearch();
                }}
                placeholder="What are you looking for?"
                className="w-full border-0 border-b border-white/60 bg-transparent pb-4 font-sans text-[34px] font-extralight leading-tight text-white placeholder:text-white/35 focus:border-white focus:outline-none md:text-[50px]"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-white/55">
                <span>Try “marketplace”, “impact” or “kiosk”.</span>
                <span>Hit enter to search or ESC to close</span>
              </div>

              <div className="mt-12 grid gap-3 md:grid-cols-2">
                {results.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => setSearchOpen(false)}
                    className="group flex items-start justify-between gap-4 rounded border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25 hover:bg-white/[0.07]"
                  >
                    <div>
                      <p className="font-display text-[19px] leading-6 text-white">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[14px] leading-6 text-white/55">{item.description}</p>
                    </div>
                    <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-smu-gold-light transition-transform group-hover:translate-x-1" />
                  </Link>
                ))}
                {results.length === 0 && (
                  <p className="text-[15px] text-white/60">
                    No matches yet. Try a broader term.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
