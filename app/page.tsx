import type { Metadata } from "next";
import Shell from "./shell";

export const metadata: Metadata = {
  title: "Scholar Lens: AI research paper search, deep dives and project outlooks",
  description: "Find the papers that truly answer your research question, understand each one in depth, and get an evidence-based outlook with opportunities, risks and scenarios for your project.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Scholar Lens",
    description: "AI research intelligence: ranked papers, deep dives and project outlooks.",
    type: "website",
  },
};

export default function Page() {
  return <Shell />;
}
