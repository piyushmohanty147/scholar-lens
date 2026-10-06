import type { Metadata } from "next";
import Shell from "./shell";

export const metadata: Metadata = {
  title: "Scholar Lens: research search and project outlooks",
  description: "Find the papers that truly answer your question, or get an evidence-based outlook with opportunities, risks and scenarios for your project.",
  openGraph: {
    title: "Scholar Lens",
    description: "AI research intelligence: ranked papers, one-tap summaries and project outlooks.",
    type: "website",
  },
};

export default function Page() {
  return <Shell />;
}
