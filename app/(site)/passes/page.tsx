"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { PageHeader } from "@/components/smu/PageChrome";
import { PassCard } from "@/components/cleaner/PassScanner";
import { useBootstrap } from "@/lib/client/use-bootstrap";

export default function PassesPage() {
  const { data } = useBootstrap();
  return (
    <>
      <PageHeader
        title="Demo staff passes"
        lead="Each QR encodes the pass number. Open the pass scanner on a phone and point it here, or tap a pass in the cleaner app."
        crumbs={[{ label: "Home", href: "/" }, { label: "Cleaner" }, { label: "Staff passes" }]}
        actions={
          <>
            <Link href="/cleaner" className="btn-smu btn-smu-outline">
              <ArrowLeft className="h-4 w-4" /> Cleaner check-in
            </Link>
            <button type="button" onClick={() => window.print()} className="btn-smu btn-smu-gold">
              <Printer className="h-4 w-4" /> Print passes
            </button>
          </>
        }
      />
      <section className="bg-smu-cream pb-20 pt-8">
        <div className="container-smu">
          <div className="grid gap-5 sm:grid-cols-2">
            {data.cleaners.map((cleaner) => (
              <div key={cleaner.id} className="rounded-md border border-black/10 bg-white p-5 shadow-card">
                <PassCard cleaner={cleaner} />
                <div className="mt-4 flex items-center justify-between text-[11.5px] text-smu-muted">
                  <span>{cleaner.vendor}</span>
                  <span className="font-mono tabular-nums">{cleaner.pass}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[12px] text-smu-muted">
            Print on A4 and cut along the card edges. The scanner reads the QR; demo taps work without a camera.
          </p>
        </div>
      </section>
    </>
  );
}
