import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ProgrammeMetric } from "@/lib/types";

function Figure({ children }: { children: React.ReactNode }) {
  return <strong className="font-normal text-smu-gold-dark">{children}</strong>;
}

export function ImpactSection({ metrics }: { metrics: ProgrammeMetric[] }) {
  const value = (key: string) => metrics.find((metric) => metric.key === key)?.value;
  const collected = value("collected");
  const co2 = value("co2");
  const diverted = value("diverted");
  const pantries = value("pantries");
  const ready = collected && co2 && diverted && pantries;

  return (
    <section id="impact" className="relative scroll-mt-[100px] overflow-hidden bg-smu-cream-light">
      <div className="absolute inset-y-0 right-0 hidden w-[34%] lg:block">
        <Image
          src="/images/coffee-cup.jpg"
          alt="Three people bringing their coffee cups together over a cafe table"
          fill
          sizes="34vw"
          className="object-cover [clip-path:polygon(22%_0,100%_0,100%_100%,0_100%)]"
        />
      </div>

      <div className="container-smu relative">
        <div className="section-pad lg:max-w-[64%]">
          <h2 className="text-[16px] font-bold leading-6 text-black">What the loop adds up to</h2>
          <p className="mt-4 min-h-[180px] font-display text-[28px] font-light leading-[38px] text-black md:text-[38px] md:leading-[52px]">
            {ready ? (
              <>
                Since launch, the programme has collected <Figure>{collected}</Figure> of grounds
                and avoided <Figure>{co2}</Figure> of CO₂e, with <Figure>{diverted}</Figure> diverted
                from incineration and <Figure>{pantries}</Figure> pantries active.
              </>
            ) : null}
          </p>
          <Link href="/dashboard#impact" className="text-link mt-7 text-[15px]">
            See the impact figures on the dashboard <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
