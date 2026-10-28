import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Research trend explorer: compare how fast topics are growing | Scholar Lens",
  description: "Free tool: compare two research topics side by side, see papers per year, fast-growing subtopics, top countries and a simple 3-year projection.",
  alternates: { canonical: "/guides/trends" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
