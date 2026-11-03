import type { Metadata } from "next";
import { Libre_Franklin, Oswald } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  variable: "--font-oswald",
});

const franklin = Libre_Franklin({
  subsets: ["latin"],
  variable: "--font-franklin",
});

export const metadata: Metadata = {
  title: "SMU Circular Coffee · Grounds for Change",
  description:
    "SMU Circular Coffee — tracking spent coffee grounds from campus pantries to their next purpose.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${oswald.variable} ${franklin.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-full bg-white">{children}</body>
    </html>
  );
}
