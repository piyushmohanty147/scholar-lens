import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";
import AuthGate from "./auth-gate";
import { SITE } from "../lib/site";

// Display serif for headlines and numbers, clean sans for everything else.
const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });


export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Scholar Lens",
  description: "AI-powered research paper discovery, deep dives and project outlooks",
  keywords: ["research papers", "paper search", "literature review", "research forecasting", "project outlook"],
  verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
  icons: { icon: "/pwa-icon/192?v=2", apple: "/pwa-icon/192?v=2" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070406",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
