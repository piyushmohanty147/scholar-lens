import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Unsubscribe | Scholar Lens",
  description: "Stop receiving Scholar Lens research-trend emails.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
