"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/smu/page-chrome";
import { PassCard } from "@/components/cleaner/pass-scanner";
import { useBootstrap } from "@/lib/client/use-bootstrap";

export default function PassesPage() {
  const { data, loading, error } = useBootstrap();
  return (
    <>
      <PageHeader
        title="Demo staff passes"
        lead="Each barcode encodes the pass number. Open the cleaner app on a phone and point it here, or type a pass number in the app."
        crumbs={[{ label: "Home", href: "/" }, { label: "Demo", href: "/demo" }, { label: "Staff passes" }]}
        actions={
          <>
            <Link href="/cleaner" className="btn-smu btn-smu-outline">
              <ArrowLeft className="h-4 w-4" /> Live check-in
            </Link>
            <Link href="/demo/cleaner" className="btn-smu btn-smu-outline">
              Demo check-in
            </Link>
          </>
        }
      />
      <section className="bg-smu-cream pb-20 pt-8">
        <div className="container-smu">
          {loading && !error && (
            <p role="status" className="text-[15px] text-smu-muted">
              Loading passes…
            </p>
          )}
          {!loading && (error || data.cleaners.length === 0) && (
            <div role="alert" className="max-w-xl rounded-md border border-smu-danger/25 bg-white p-5">
              <h2 className="font-display text-[24px] leading-8 text-smu-navy">
                {error ? "Couldn’t load the passes" : "No staff passes yet"}
              </h2>
              <p className="mt-2 text-[15px] leading-6 text-black/80">
                The passes come from the database, so they appear once it is running and seeded.
                Start it and load the demo data, then refresh this page:
              </p>
              <pre className="mt-3 overflow-x-auto rounded bg-smu-cream-light p-3 font-mono text-[13px]">
{`docker compose up -d --wait
bun run db:migrate
bun run db:seed`}
              </pre>
              {error && <p className="mt-3 text-[13px] text-smu-muted">Error: {error}</p>}
            </div>
          )}
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
          <p className="mt-6 text-center text-[12px] text-smu-muted" hidden={data.cleaners.length === 0}>
            The app reads the barcode, or you can type the number if a camera isn&apos;t available.
          </p>
        </div>
      </section>
    </>
  );
}
