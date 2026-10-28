import type { Metadata } from "next";
import Link from "next/link";
import Legal from "../legal";
import { GUIDES, GUIDES_UPDATED } from "../../lib/guides";

export const metadata: Metadata = {
  title: "Research guides and free tools | Scholar Lens",
  description: "Free practical guides on literature reviews, reading papers quickly and judging whether a research topic is growing, plus a free trend explorer.",
  alternates: { canonical: "/guides" },
};

export default function Page() {
  return (
    <Legal title="Research guides and free tools" updated={GUIDES_UPDATED}>
      <p>Short, practical guides and free tools for students, researchers and anyone who needs to understand a field quickly.</p>

      <h2>Free tool</h2>
      <ul>
        <li>
          <Link href="/guides/trends"><strong>Research trend explorer</strong></Link>
          <br />
          Compare two research topics: papers per year, fast-growing subtopics, leading countries and a simple 3-year projection.
        </li>
      </ul>

      <h2>Guides</h2>
      <ul>
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`}><strong>{g.title}</strong></Link>
            <br />
            {g.description}
          </li>
        ))}
      </ul>
      <p><Link href="/">Try Scholar Lens free</Link></p>
    </Legal>
  );
}
