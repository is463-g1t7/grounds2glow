"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-smu-navy text-white">
      <div className="absolute inset-x-0 top-0 h-44 bg-white/[0.025] [clip-path:polygon(100%_0,100%_100%,55%_0)]" />
      <img
        src="/images/footer-bg.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 left-1/2 w-[1150px] max-w-[140%] -translate-x-1/2 opacity-[0.07] mix-blend-screen"
      />
      <div className="container-smu relative py-12">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between md:gap-8">
          <div>
            <Link href="/" aria-label="SMU Circular Coffee — home">
              <img
                src="/smu-logo-white.svg"
                alt="Singapore Management University"
                className="h-[88px] w-auto"
              />
            </Link>
            <h2 className="mt-8 font-sans text-[16px] font-semibold uppercase leading-5 tracking-[1.6px] text-white">
              Administration Building
            </h2>
            <address className="mt-3 not-italic text-[14px] leading-[21px] text-white/80">
              Singapore Management University
              <br />
              81 Victoria Street
              <br />
              Singapore 188065
            </address>
          </div>

          <div>
            <h2 className="font-sans text-[16px] font-semibold uppercase leading-5 tracking-[1.6px] text-white">
              Directories
            </h2>
            <ul className="mt-5 space-y-3.5">
              <li>
                <Link href="/kiosk"
                  className="inline-flex items-center gap-1.5 text-[14px] leading-[21px] text-white/80 transition-colors hover:text-white"
                >
                  Grounds to Glow kiosk
                  <ArrowUpRight className="h-3.5 w-3.5 text-white/55" />
                </Link>
              </li>
              <li>
                <Link href="/scan"
                  className="inline-flex items-center gap-1.5 text-[14px] leading-[21px] text-white/80 transition-colors hover:text-white"
                >
                  Scale scanner
                  <ArrowUpRight className="h-3.5 w-3.5 text-white/55" />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
