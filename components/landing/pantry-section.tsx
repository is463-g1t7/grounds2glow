import Image from "next/image";
import Link from "next/link";
import { StageMark } from "./shared";

const steps = [
  ["Scan a staff pass", "The camera reads the barcode, so every drop-off is signed."],
  ["Pick the pantry", "Choose the building on the map, then the level."],
  ["Weigh the bin", "OCR reads the scale. There is nothing to type."],
];

export function PantrySection() {
  return (
    <section id="pantry" className="section-pad section-slant relative z-30 scroll-mt-[100px] overflow-hidden bg-smu-cream md:py-24">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 hidden w-[52%] bg-smu-cream-dark/50 [clip-path:polygon(22%_0,100%_0,100%_100%,0_100%)] lg:block"
      />
      <div className="container-smu relative grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <StageMark stage={1} />
          <h2 className="display-h2 mt-5 text-black">Logged where the grounds are emptied</h2>
          <p className="mt-4 max-w-[60ch] text-[18px] leading-7 text-black">
            Pantry staff log each drop-off on their phone. Every reading records who, where and
            how much.
          </p>

          <ol className="mt-8 space-y-5">
            {steps.map(([title, text]) => (
              <li key={title} className="border-l-2 border-smu-gold pl-4">
                <h3 className="text-[16px] font-semibold leading-6 text-smu-navy">{title}</h3>
                <p className="max-w-[60ch] text-[15px] leading-6 text-black/80">{text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-8">
            <Link href="/cleaner" className="cta cta-navy">
              Open smart bin interface
            </Link>
          </div>
        </div>

        <div className="relative lg:col-span-7">
          <div
            aria-hidden="true"
            className="absolute inset-0 -translate-x-3 translate-y-3 bg-smu-gold [clip-path:polygon(0_0,100%_0,100%_100%,8%_100%)] md:-translate-x-4 md:translate-y-4"
          />
          <div className="relative aspect-[16/10] w-full overflow-hidden [clip-path:polygon(0_0,100%_0,100%_100%,8%_100%)]">
            <Image
              src="/images/smu-campus-map.jpeg"
              alt="Map of the SMU campus, used to choose a building"
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
