import type { Metadata } from "next";
import "./globals.css";
import AuthGate from "./auth-gate";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://scholar-lens-emc5.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Scholar Lens",
  description: "AI-powered research paper discovery, deep dives and project outlooks",
  keywords: ["research papers", "paper search", "literature review", "research forecasting", "project outlook"],
  verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
