import Link from "next/link";
import { KioskChat } from "@/components/kiosk/kiosk-chat";
import { useQr } from "@/lib/client/use-qr";
import { StageMark } from "./shared";

export function ChatbotSection() {
  const qr = useQr("/kiosk?chat=1");

  return (
    <section id="kiosk" className="section-pad scroll-mt-[100px] bg-smu-gold text-white">
      <div className="container-smu grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <StageMark stage={3} className="stage-mark-navy" />
          <h2 className="display-h2 mt-5 text-white">Then the grounds get a second life</h2>
          <p className="mt-4 max-w-[60ch] text-[18px] leading-7 text-white">
            The Grounds to Glow kiosk turns dried grounds into a free DIY body scrub. Its AI guide
            answers questions about recipes, safe use and storage, and a short quiz suggests a
            scrub. Try it here.
          </p>

          <div className="mt-7">
            <Link href="/kiosk" className="cta cta-navy focus-visible:outline-white">
              Start at the kiosk
            </Link>
          </div>

          {qr && (
            <div className="mt-9 hidden items-center gap-4 border-t border-white/30 pt-6 lg:flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt="QR code that opens the Grounds to Glow guide on a phone"
                className="h-[112px] w-[112px] rounded-[3px]"
              />
              <p className="max-w-[26ch] text-[15px] leading-6 text-white">
                Scan to keep chatting on your phone, the way visitors do at the kiosk.
              </p>
            </div>
          )}
        </div>

        <div className="flex h-[620px] flex-col overflow-hidden rounded-[4px] bg-white text-black shadow-lift lg:col-span-7">
          <KioskChat embedded />
        </div>
      </div>
    </section>
  );
}
