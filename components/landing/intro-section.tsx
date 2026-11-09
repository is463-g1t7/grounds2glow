import { ArrowDown } from "lucide-react";
import { StageMark } from "./shared";

const stages = [
  { title: "Pantry staff", href: "#pantry" },
  { title: "Smart bin dashboard", href: "#dashboard" },
  { title: "Grounds to Glow Kiosk", href: "#kiosk" },
] as const;

/** Opens the page: what Grounds to Glow is, and the route the rest of the page follows. */
export function IntroSection() {
  return (
    <section className="section-slant relative z-40 overflow-hidden bg-smu-navy-deep pb-20 pt-[148px] text-white md:pb-28 md:pt-[196px]">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 hidden w-[46%] bg-white/[0.035] [clip-path:polygon(30%_0,100%_0,100%_100%,0_100%)] lg:block"
      />

      <div className="container-smu relative grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <h1 className="display-hero text-[clamp(52px,6.4vw,96px)] font-light leading-[1.02]">
            Grounds to Glow
          </h1>
          <span
            aria-hidden="true"
            className="mt-7 block h-[6px] w-[72px] bg-smu-gold [clip-path:polygon(8%_0,100%_0,92%_100%,0_100%)]"
          />
          <p className="mt-8 max-w-[54ch] text-[19px] leading-[32px] text-white/85 md:text-[21px] md:leading-[35px]">
            An initiative by{" "}
            <strong className="font-semibold text-white">
              SMU’s Office of Campus Infrastructure &amp; Services (OCIS)
            </strong>{" "}
            that aims to reduce campus waste, raise environmental awareness and promote circularity
            within the SMU community by giving coffee grounds a second life.
          </p>
        </div>

        <nav aria-label="The three stages" className="lg:col-span-5 lg:pl-10">
          <ol>
            {stages.map((stage, index) => (
              <li key={stage.href} className="relative">
                {index < stages.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[31px] top-[48px] h-full w-px bg-smu-gold-light/50"
                  />
                )}
                <a href={stage.href} className="group relative flex items-start gap-5 py-5 md:gap-6">
                  <StageMark stage={(index + 1) as 1 | 2 | 3} className="relative" />
                  <span className="min-w-0 flex-1 pt-3 md:pt-[10px]">
                    <span className="block font-display text-[26px] leading-8 text-white transition-colors group-hover:text-smu-gold-light md:text-[30px] md:leading-9">
                      {stage.title}
                    </span>
                  </span>
                  <ArrowDown
                    aria-hidden="true"
                    className="mt-[18px] h-5 w-5 shrink-0 text-smu-gold-light transition-transform group-hover:translate-y-0.5"
                  />
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
}
