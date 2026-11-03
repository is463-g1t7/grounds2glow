"use client";

import {
  ArrowUpRight,
  Mail,
  MapPin,
  Music2,
  ParkingSquare,
  Phone,
} from "lucide-react";
import Link from "next/link";

const schools = [
  "College of Integrative Studies",
  "College of Graduate Research Studies",
  "Lee Kong Chian School of Business",
  "School of Accountancy",
  "School of Computing and Information Systems",
  "School of Economics",
  "School of Social Sciences",
  "Yong Pung How School of Law",
];

const socials = [
  { label: "Facebook", href: "https://facebook.com/sgsmu", Icon: FacebookIcon },
  { label: "Instagram", href: "https://www.instagram.com/sgsmu", Icon: InstagramIcon },
  { label: "X", href: "https://twitter.com/sgsmu", Icon: XIcon },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/singapore-management-university/", Icon: LinkedInIcon },
  { label: "YouTube", href: "https://www.youtube.com/smutubesg", Icon: YouTubeIcon },
  { label: "SoundCloud", href: "https://soundcloud.com/sgsmu", Icon: SoundCloudIcon },
  { label: "TikTok", href: "https://www.tiktok.com/@sgsmu", Icon: Music2 },
];

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 12.073C24 5.446 18.627.073 12 .073S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function SoundCloudIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M1.5 12.5v4.2h1.2v-4.2H1.5zm2.4-1.6v5.8h1.2v-5.8H3.9zm2.4-1.1v6.9h1.2V9.8H6.3zm2.4-.6v7.5H10v-7.5H8.7zm2.5-.5v8h1.2v-8h-1.2zm2.4-1.5v9.5h1.2V7.2h-1.2zm2.5-1.2v10.7h1.2V6h-1.2zm2.4 2.2c-.4 0-.8.1-1.1.2V17h5.1c2.2 0 3.9-1.7 3.9-3.9s-1.7-3.9-3.9-3.9c-.6 0-1.2.1-1.7.4-.5-1.7-2-2.9-3.8-2.9-.4 0-.8.1-1.1.2v6.2z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.9 2h3.4l-7.4 8.5L23.6 22h-6.8l-5.3-6.9L5.4 22H2l7.9-9.1L1.7 2h7l4.8 6.3L18.9 2Zm-1.2 18h1.9L7.3 3.9H5.3L17.7 20Z" />
    </svg>
  );
}

function FooterLink({ children, href }: { children: React.ReactNode; href: string }) {
  const external = href.startsWith("http");
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group inline-flex items-start gap-1.5 text-[14px] leading-[21px] text-white/80 transition-colors hover:text-white"
      >
        {children}
        <ArrowUpRight className="mt-[3px] h-3.5 w-3.5 shrink-0 text-white/55 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
      </a>
    );
  }
  return (
    <Link href={href}
      className="inline-flex items-start gap-1.5 text-[14px] leading-[21px] text-white/80 transition-colors hover:text-white"
    >
      {children}
      <ArrowUpRight className="mt-[3px] h-3.5 w-3.5 shrink-0 text-white/55" />
    </Link>
  );
}

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
      <div className="container-smu relative pb-0 pt-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
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

          <div className="lg:col-span-3">
            <h2 className="font-sans text-[16px] font-semibold uppercase leading-5 tracking-[1.6px] text-white">
              Get in touch
            </h2>
            <ul className="mt-5 space-y-4">
              <li>
                <a
                  href="mailto:enquiry@smu.edu.sg"
                  className="inline-flex items-center gap-2 text-[14px] leading-[21px] text-white/80 transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4 text-white/55" />
                  enquiry@smu.edu.sg
                </a>
              </li>
              <li>
                <a
                  href="tel:+6568280100"
                  className="inline-flex items-center gap-2 text-[14px] leading-[21px] text-white/80 transition-colors hover:text-white"
                >
                  <Phone className="h-4 w-4 text-white/55" />
                  +65 6828 0100
                </a>
              </li>
              <li>
                <a
                  href="https://maps.smu.edu.sg/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[14px] leading-[21px] text-white/80 transition-colors hover:text-white"
                >
                  <MapPin className="h-4 w-4 text-white/55" />
                  Getting to SMU
                </a>
              </li>
              <li>
                <a
                  href="https://www.smu.edu.sg/campus-life/visiting-smu/carpark-information"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[14px] leading-[21px] text-white/80 transition-colors hover:text-white"
                >
                  <ParkingSquare className="h-4 w-4 text-white/55" />
                  Carpark Information
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h2 className="font-sans text-[16px] font-semibold uppercase leading-5 tracking-[1.6px] text-white">
              Directories
            </h2>
            <ul className="mt-5 space-y-3.5">
              <li>
                <FooterLink href="https://faculty.smu.edu.sg">Faculty Directory</FooterLink>
              </li>
              <li>
                <FooterLink href="https://library.smu.edu.sg">Libraries</FooterLink>
              </li>
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

          <div className="lg:col-span-3">
            <h2 className="font-sans text-[16px] font-semibold uppercase leading-5 tracking-[1.6px] text-white">
              Schools
            </h2>
            <ul className="mt-5 space-y-3.5">
              {schools.map((school) => (
                <li key={school}>
                  <FooterLink href={`https://${schoolSlug(school)}.smu.edu.sg`}>
                    {school}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-11 border-t border-white/15 py-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <ul className="flex flex-wrap gap-x-7 gap-y-2">
              {[
                ["Terms of Use", "https://www.smu.edu.sg/terms-use"],
                ["Website Feedback", "https://www.smu.edu.sg/form/website-feedback"],
                ["Report Whistleblowing", "https://www.smu.edu.sg/forms/whistleblowing-report-form"],
                ["Personal Data Protection", "https://www.smu.edu.sg/personal-data-protection-statement"],
              ].map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[13.5px] leading-5 text-white/75 transition-colors hover:text-white"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <ul className="flex items-center gap-4">
              {socials.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`SMU on ${label}`}
                    className="text-white/75 transition-colors hover:text-white"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-5 text-[13.5px] leading-5 text-white/75">
            © 2026 Singapore Management University. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function schoolSlug(name: string) {
  const map: Record<string, string> = {
    "College of Integrative Studies": "cis",
    "College of Graduate Research Studies": "graduatestudies",
    "Lee Kong Chian School of Business": "business",
    "School of Accountancy": "accountancy",
    "School of Computing and Information Systems": "computing",
    "School of Economics": "economics",
    "School of Social Sciences": "socsc",
    "Yong Pung How School of Law": "law",
  };
  return map[name] ?? "www";
}
