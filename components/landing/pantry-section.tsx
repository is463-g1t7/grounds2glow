import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Cleaner } from "@/lib/types";
import { StageMark } from "./shared";

const PASS = "SMU-CLN-0142";

const steps = [
  ["Scan a staff pass", "The camera reads the barcode on the pass, so the drop-off is signed from the start."],
  ["Pick the pantry", "Choose the building on the campus map, then the level the grounds came from."],
  ["Weigh the bin", "OCR reads the scale display and saves the weight, with nothing to type."],
];

export function PantrySection({ cleaners }: { cleaners: Cleaner[] }) {
  const holder = cleaners.find((cleaner) => cleaner.pass === PASS);

  return (
    <section id="pantry" className="section-pad scroll-mt-[100px] bg-smu-cream">
      <div className="container-smu grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <StageMark stage={1} />
          <h2 className="display-h2 mt-5 text-black">Logged where the grounds are emptied</h2>
          <p className="mt-4 max-w-[60ch] text-[18px] leading-7 text-black">
            Pantry staff record each drop-off on their phone in three steps. Every reading says who
            logged it, where and how much.
          </p>

          <ol className="mt-8 border-t border-black/15">
            {steps.map(([title, text]) => (
              <li key={title} className="border-b border-black/15 py-4">
                <h3 className="text-[16px] font-semibold leading-6 text-smu-navy">{title}</h3>
                <p className="mt-1 max-w-[60ch] text-[15px] leading-6 text-black/80">{text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/cleaner" className="cta cta-navy">
              Open the pantry staff app
            </Link>
            <Link href="/passes" className="text-link text-[15px]">
              Print staff passes <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative lg:col-span-7">
          <div className="relative aspect-[16/10] w-full overflow-hidden [clip-path:polygon(0_0,100%_0,100%_100%,8%_100%)]">
            <Image
              src="/images/smu-campus-map.jpeg"
              alt="Map of the SMU campus, used to choose a building"
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          </div>

          <figure className="relative mx-auto -mt-16 w-[230px] rounded-[4px] bg-white p-4 shadow-lift sm:absolute sm:bottom-6 sm:left-0 sm:mt-0 sm:w-[250px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/passes/${PASS}.svg`}
              alt={`Barcode on staff pass ${PASS}`}
              className="block h-auto w-full"
              loading="lazy"
            />
            <figcaption className="mt-3 border-t border-black/10 pt-3">
              <span className="block font-display text-[19px] leading-6 text-smu-navy">
                {holder?.name ?? "Staff pass"}
              </span>
              <span className="mt-0.5 block text-[12.5px] tabular-nums leading-5 text-smu-muted">{PASS}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
