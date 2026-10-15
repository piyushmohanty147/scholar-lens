import type { Metadata } from "next";
import Link from "next/link";
import Legal from "../legal";
import { GUIDES, GUIDES_UPDATED } from "../../lib/guides";

export const metadata: Metadata = {
  title: "Research guides | Scholar Lens",
  description: "Free practical guides on literature reviews, reading papers quickly and judging whether a research topic is growing.",
  alternates: { canonical: "/guides" },
};

export default function Page() {
  return (
    <Legal title="Research guides" updated={GUIDES_UPDATED}>
      <p>Short, practical guides for students, researchers and anyone who needs to understand a field quickly.</p>
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
