"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Coffee,
  Filter,
  MapPin,
  Package,
  Scale,
  Search,
  Sparkles,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/smu/PageChrome";
import { Toast } from "@/components/smu/Toast";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import { apiRequest, useBootstrap } from "@/lib/client/use-bootstrap";
import type { Listing } from "@/lib/types";
import { formatKg } from "@/lib/utils";

const typeOptions = ["All types", "Espresso", "Filter", "Decaf"] as const;

const schoolCodes: Record<string, string> = {
  "Administration Building": "OCIS",
  "School of Computing": "SCIS",
  "Lee Kong Chian School of Business": "LKCSB",
  "School of Accountancy": "SOA",
  "School of Economics": "SOE",
  "School of Social Sciences": "SOSS",
  "Yong Pung How School of Law": "SOL",
  "College of Integrative Studies": "CIS",
};

export default function MarketplacePage() {
  const { data, setData, refresh } = useBootstrap();
  const listings = data.listings;
  const pantryLevels = data.bins.reduce((sum, bin) => sum + bin.levels, 0);
  const [query, setQuery] = useState("");
  const [building, setBuilding] = useState("All buildings");
  const [type, setType] = useState<(typeof typeOptions)[number]>("All types");
  const [sort, setSort] = useState("Newest");
  const [matchText, setMatchText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const router = useRouter();

  const buildings = useMemo(
    () => ["All buildings", ...Array.from(new Set(listings.map((l) => l.building)))],
    [listings]
  );

  const filtered = useMemo(() => {
    const result = listings.filter((listing) => {
      const matchesQuery = `${listing.title} ${listing.building} ${schoolCodes[listing.building] ?? ""} ${listing.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesBuilding = building === "All buildings" || listing.building === building;
      const matchesType = type === "All types" || listing.type === type;
      return matchesQuery && matchesBuilding && matchesType;
    });
    if (sort === "Largest batch") return [...result].sort((a, b) => b.weightKg - a.weightKg);
    if (sort === "Pickup soon") return [...result].sort((a, b) => a.pickup.localeCompare(b.pickup));
    return [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [listings, query, building, type, sort]);

  const claim = async (id: string) => {
    const item = listings.find((l) => l.id === id);
    try {
      const { listing } = await apiRequest<{ listing: Listing }>(`/api/listings/${id}/claim`, {
        method: "POST",
      });
      setData((prev) =>
        prev
          ? { ...prev, listings: prev.listings.map((l) => (l.id === id ? listing : l)) }
          : prev
      );
      setToast(
        `${formatKg(listing.weightKg)} reserved. Collection details have been sent to your SMU email.`
      );
    } catch {
      setToast(
        `${item ? formatKg(item.weightKg) : "Batch"} could not be reserved — it may already be claimed.`
      );
    }
  };

  const startMatch = (text: string) => {
    const value = text.trim() || matchText.trim();
    if (!value) return;
    router.push(`/assistant?q=${encodeURIComponent(value)}`);
  };

  const claimedCount = listings.filter((l) => l.claimed).length;

  return (
    <>
      <PageHeader
        title="Grounds marketplace"
        lead="Fresh spent coffee grounds from across campus — weighed, sealed and ready for their next purpose."
        crumbs={[{ label: "Home", href: "/" }, { label: "Marketplace" }]}
        actions={
          <>
            <Link href="/assistant" className="btn-smu btn-smu-outline">
              <Sparkles className="h-3.5 w-3.5" /> Ask Grounds AI
            </Link>
            <button type="button" onClick={() => setListOpen(true)} className="btn-smu btn-smu-gold">
              <Package className="h-3.5 w-3.5" /> List a batch
            </button>
          </>
        }
      />

      <section className="bg-smu-cream pb-16 pt-8 md:pb-20">
        <div className="container-smu">
          <div className="overflow-hidden rounded bg-smu-navy text-white">
            <div className="grid gap-6 p-6 md:grid-cols-12 md:items-center md:p-8">
              <div className="md:col-span-5">
                <p className="eyebrow text-white/55">Grounds AI matching</p>
                <h2 className="mt-2 display-h3 text-white">Tell us what you&apos;re growing</h2>
                <p className="mt-2 max-w-md text-[14px] leading-6 text-white/70">
                  Describe the use case — a garden bed, a workshop, a research trial — and Grounds
                  AI will shortlist the best batches by weight, freshness and walking distance.
                </p>
              </div>
              <div className="md:col-span-7">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    startMatch(matchText);
                  }}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <label htmlFor="match-input" className="sr-only">
                    Describe what you need
                  </label>
                  <input
                    id="match-input"
                    value={matchText}
                    onChange={(e) => setMatchText(e.target.value)}
                    placeholder="I need 20 kg for a community garden this week…"
                    className="min-w-0 flex-1 rounded border border-white/25 bg-white/10 px-4 py-2.5 text-[14px] text-white placeholder:text-white/45 focus:border-smu-gold-light focus:bg-white/15 focus:outline-none"
                  />
                  <button type="submit" className="btn-smu btn-smu-light shrink-0">
                    Find my match <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </form>
                <Suggestions className="mt-3">
                  {[
                    "20 kg for a community garden",
                    "Small batch for a classroom",
                    "Nitrogen-rich for compost",
                  ].map((prompt) => (
                    <Suggestion
                      key={prompt}
                      onClick={() => {
                        setMatchText(prompt);
                        startMatch(prompt);
                      }}
                      className="border-smu-gold-light/40 bg-transparent text-white/80 hover:border-smu-gold-light hover:bg-white/5 hover:text-white"
                    >
                      {prompt}
                    </Suggestion>
                  ))}
                </Suggestions>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="display-h2 text-smu-navy">Available grounds</h2>
                <p className="mt-1 text-[14px] text-smu-muted">
                  Showing {filtered.length} of {listings.length} batches
                  {claimedCount > 0 && ` · ${claimedCount} reserved by you`}
                </p>
              </div>
              <Link href="/dashboard" className="text-link text-[13px]">
                See all {pantryLevels} pantry levels <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-4 bg-smu-cream-dark p-3">
              <div className="grid gap-2 md:grid-cols-12">
                <label className="relative md:col-span-5">
                  <span className="sr-only">Filter by title or building</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter by title, building or tag"
                    className="w-full border border-black/10 bg-white py-2.5 pl-9 pr-3 text-[13.5px] text-black placeholder:text-black/35 focus:border-smu-gold focus:outline-none"
                  />
                </label>
                <label className="relative md:col-span-3">
                  <span className="sr-only">Filter by building</span>
                  <select
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    className="w-full appearance-none border border-black/10 bg-white px-3 py-2.5 pr-8 text-[13.5px] text-black focus:border-smu-gold focus:outline-none"
                  >
                    {buildings.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                  <Filter className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35" />
                </label>
                <label className="relative md:col-span-2">
                  <span className="sr-only">Filter by type</span>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as (typeof typeOptions)[number])}
                    className="w-full appearance-none border border-black/10 bg-white px-3 py-2.5 pr-8 text-[13.5px] text-black focus:border-smu-gold focus:outline-none"
                  >
                    {typeOptions.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="relative md:col-span-2">
                  <span className="sr-only">Sort listings</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full appearance-none border border-black/10 bg-white px-3 py-2.5 pr-8 text-[13.5px] text-black focus:border-smu-gold focus:outline-none"
                  >
                    {["Newest", "Largest batch", "Pickup soon"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((listing) => (
                <article
                  key={listing.id}
                  className={`group flex flex-col overflow-hidden rounded-md bg-white shadow-card transition-all ${
                    listing.claimed ? "opacity-70" : "hover:-translate-y-1 hover:shadow-lift"
                  }`}
                >
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={listing.image}
                      alt=""
                      className="aspect-[16/10] w-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute left-2.5 top-2.5 rounded bg-white/95 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.7px] text-smu-navy">
                      {listing.type}
                    </span>
                    {listing.claimed && (
                      <span className="absolute inset-0 flex items-center justify-center bg-smu-navy/55">
                        <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-smu-navy">
                          <CheckCircle2 className="h-3.5 w-3.5 text-smu-success" /> Reserved
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex flex-wrap gap-1">
                      {listing.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-smu-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] text-smu-gold-dark"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="mt-2 text-[16.5px] font-semibold leading-[22px] text-smu-navy">
                      {listing.title}
                    </h3>
                    <p className="mt-1 flex items-start gap-1 text-[12px] leading-4 text-smu-muted">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      {listing.building}
                    </p>
                    <div className="mt-3 flex items-end justify-between border-t border-black/8 pt-3">
                      <div>
                        <p className="font-display text-[22px] leading-6 text-smu-gold">
                          {formatKg(listing.weightKg)}
                        </p>
                        <p className="mt-1 text-[11px] text-smu-muted">{listing.pickup}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => claim(listing.id)}
                        disabled={listing.claimed}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-smu-navy transition-colors hover:text-smu-gold disabled:cursor-default disabled:text-black/35"
                      >
                        {listing.claimed ? "Reserved" : "Claim"}
                        {!listing.claimed && <ArrowRight className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="mt-5 rounded-md bg-white p-10 text-center shadow-card">
                <Coffee className="mx-auto h-8 w-8 text-smu-gold" />
                <h3 className="mt-3 font-display text-[24px] text-smu-navy">No batches match yet</h3>
                <p className="mt-1 text-[14px] text-smu-muted">
                  Try a broader filter, or ask Grounds AI to find a match for your use case.
                </p>
                <Link href="/assistant" className="btn-smu btn-smu-gold mt-4">
                  Ask Grounds AI <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>

          <div id="guidance" className="mt-14 scroll-mt-[120px]">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[16px] font-bold leading-6 text-black">Handling guide</p>
                <h2 className="display-h2 mt-2 text-smu-navy">How every batch is handled</h2>
              </div>
              <Link href="/assistant" className="text-link text-[13px]">
                Ask about storage <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {[
                {
                  Icon: Scale,
                  title: "Weighed at source",
                  text: "Every drop-off is weighed on the pantry scale and logged against the bin, time and staff member.",
                },
                {
                  Icon: Warehouse,
                  title: "Sealed and labelled",
                  text: "Grounds are stored in food-grade tubs with a batch ID, so the chain of custody stays intact.",
                },
                {
                  Icon: Truck,
                  title: "Collected fresh",
                  text: "Pickups are batched by building and matched to the nearest use — usually within 48 hours.",
                },
              ].map(({ Icon, title, text }) => (
                <div key={title} className="rounded-md border-t-2 border-smu-gold bg-white p-5 shadow-card">
                  <Icon className="h-6 w-6 text-smu-gold" strokeWidth={1.5} />
                  <h3 className="mt-3 font-display text-[24px] leading-8 text-smu-navy">{title}</h3>
                  <p className="mt-2 text-[13.5px] leading-6 text-smu-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {listOpen && (
        <ListBatchDialog
          buildings={buildings.slice(1)}
          onClose={() => setListOpen(false)}
          onSubmit={async (batch) => {
            try {
              const { listing } = await apiRequest<{ listing: Listing }>("/api/listings", {
                method: "POST",
                body: JSON.stringify({
                  title: `${batch.type} grounds`,
                  type: batch.type,
                  weightKg: batch.weight,
                  building: batch.building,
                  donor: "You",
                  pickup: batch.pickup,
                  image: "/images/coffee-machine.jpg",
                  tags: ["New", "Available now"],
                  note: batch.note,
                }),
              });
              setData((prev) =>
                prev ? { ...prev, listings: [listing, ...prev.listings] } : prev
              );
              setToast(
                `${formatKg(listing.weightKg)} listed at ${listing.building}. It is now visible to campus claimants.`
              );
            } catch {
              await refresh();
              setToast("Batch could not be listed — please try again.");
            }
            setListOpen(false);
          }}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}

function ListBatchDialog({
  buildings,
  onClose,
  onSubmit,
}: {
  buildings: string[];
  onClose: () => void;
  onSubmit: (batch: {
    type: "Espresso" | "Filter" | "Decaf";
    weight: number;
    building: string;
    pickup: string;
    note: string;
  }) => void;
}) {
  const [type, setType] = useState<"Espresso" | "Filter" | "Decaf">("Espresso");
  const [weight, setWeight] = useState("5.0");
  const [building, setBuilding] = useState(buildings[0] ?? "School of Computing");
  const [pickup, setPickup] = useState("Today · 14:00–17:00");
  const [note, setNote] = useState("");
  const weightRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    weightRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 md:items-center">
      <button
        className="absolute inset-0 bg-smu-navy-deep/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="list-batch-title"
        className="fade-up relative w-full max-w-lg rounded bg-white p-6 shadow-2xl md:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded p-1.5 text-black/40 transition-colors hover:bg-black/5 hover:text-black"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="eyebrow text-smu-gold">Marketplace</p>
        <h2 id="list-batch-title" className="display-h3 mt-2 text-smu-navy">
          List a batch
        </h2>
        <p className="mt-2 text-[14px] leading-6 text-smu-muted">
          Add a sealed batch from your pantry. Claims are matched to the pickup window.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = Number(weight);
            if (!Number.isFinite(parsed) || parsed <= 0) return;
            onSubmit({ type, weight: parsed, building, pickup, note });
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-smu-muted">
              Pantry building
            </span>
            <select
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="w-full rounded border border-black/20 bg-white px-3 py-2.5 text-[14px] focus:border-smu-gold focus:outline-none"
            >
              {buildings.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-smu-muted">
                Weight (kg)
              </span>
              <input
                ref={weightRef}
                type="number"
                min="0.1"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full rounded border border-black/20 px-3 py-2.5 text-[14px] focus:border-smu-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-smu-muted">
                Type
              </span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                className="w-full rounded border border-black/20 bg-white px-3 py-2.5 text-[14px] focus:border-smu-gold focus:outline-none"
              >
                {["Espresso", "Filter", "Decaf"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-smu-muted">
                Pickup
              </span>
              <input
                type="text"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className="w-full rounded border border-black/20 px-3 py-2.5 text-[14px] focus:border-smu-gold focus:outline-none"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[1px] text-smu-muted">
              Note (optional)
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Storage details, container size, access notes"
              className="w-full rounded border border-black/20 px-3 py-2.5 text-[14px] placeholder:text-black/30 focus:border-smu-gold focus:outline-none"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-smu btn-smu-outline">
              Cancel
            </button>
            <button type="submit" className="btn-smu btn-smu-gold">
              Publish batch <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
