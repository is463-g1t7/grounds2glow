import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/smu/page-chrome";

export const metadata = { title: "Demo" };

const live = [
  ["Smart bin interface", "/cleaner", "Scan a staff pass, pick a pantry, photograph the scale. The photo is read by real OCR."],
  ["Live dashboard", "/dashboard", "Every reading from the stations above, as it arrives."],
] as const;

const demo = [
  ["Smart bin interface", "/demo/cleaner", "The same screens, reading a sample scale photo instead of a real scale. For recordings and assessor walkthroughs."],
  ["Scale scanner", "/demo/scan", "A simulated one-click scanner. Posts a sample reading and ignores your photo."],
  ["OCR reader", "/demo/ocr", "A simulated OCR tool with canned results. Nothing is saved."],
  ["Demo staff passes", "/passes", "Barcode passes to hold up at either station."],
] as const;

function Card({ title, href, text }: { title: string; href: string; text: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex h-full flex-col gap-2 rounded-md border border-black/10 bg-white p-5 shadow-card transition-colors hover:border-smu-gold"
      >
        <span className="flex items-center gap-1.5 font-display text-[22px] leading-7 text-smu-navy">
          {title} <ArrowUpRight className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-[15px] leading-6 text-black/75">{text}</span>
      </Link>
    </li>
  );
}

export default function DemoHubPage() {
  return (
    <>
      <PageHeader
        title="Live and demo"
        lead="The live station reads a real scale. The demo station uses stand-ins so you can try the loop without one. They are separate on purpose."
        crumbs={[{ label: "Home", href: "/" }, { label: "Demo" }]}
      />
      <section className="bg-smu-cream pb-20 pt-8">
        <div className="container-smu grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[1px] text-smu-muted">
              <span aria-hidden className="h-2 w-2 rounded-full bg-smu-success" /> Live
              <span className="font-normal normal-case tracking-normal">· real photos, real OCR</span>
            </h2>
            <ul className="mt-4 grid gap-4">
              {live.map(([t, h, x]) => <Card key={h} title={t} href={h} text={x} />)}
            </ul>
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[1px] text-smu-gold-dark">
              <span aria-hidden className="h-2 w-2 rounded-full bg-smu-gold" /> Demo
              <span className="font-normal normal-case tracking-normal">· simulated, saved as &ldquo;Demo reading&rdquo;</span>
            </h2>
            <ul className="mt-4 grid gap-4">
              {demo.map(([t, h, x]) => <Card key={h} title={t} href={h} text={x} />)}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
