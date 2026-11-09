import Link from "next/link";
import { KioskChat } from "@/components/kiosk/kiosk-chat";
import { StageMark } from "./shared";

export function ChatbotSection() {
  return (
    <section id="kiosk" className="section-pad relative scroll-mt-[100px] overflow-hidden bg-smu-gold text-white [--slant:clamp(28px,3.6vw,60px)] md:py-24">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 hidden w-[58%] bg-black/[0.07] [clip-path:polygon(22%_0,100%_0,100%_100%,0_100%)] lg:block"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[var(--slant)] bg-smu-navy [clip-path:polygon(100%_0,100%_100%,0_100%)]"
      />
      <div className="container-smu relative grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
        <div className="lg:col-span-5">
          <StageMark stage={3} className="stage-mark-navy" />
          <h2 className="display-h2 mt-5 text-white">Then the grounds get a second life</h2>
          <p className="mt-4 max-w-[60ch] text-[18px] leading-7 text-white">
            The Grounds to Glow kiosk turns dried grounds into a free DIY body scrub. Ask its AI
            guide about recipes, safe use and storage, or take the short quiz for a suggestion.
          </p>

          <div className="mt-7">
            <Link href="/kiosk" className="cta cta-navy focus-visible:outline-white">
              Start at the kiosk
            </Link>
          </div>
        </div>

        <div className="flex h-[620px] flex-col overflow-hidden rounded-[4px] border-t-4 border-smu-navy bg-white text-black shadow-lift lg:col-span-7">
          <KioskChat embedded />
        </div>
      </div>
    </section>
  );
}
