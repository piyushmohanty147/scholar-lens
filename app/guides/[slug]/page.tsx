import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Legal from "../../legal";
import { GUIDES, GUIDES_UPDATED, getGuide } from "../../../lib/guides";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return {};
  return {
    title: `${g.title} | Scholar Lens`,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();

  return (
    <Legal title={g.title} updated={GUIDES_UPDATED}>
      <p>{g.description}</p>
      {g.sections.map((s) => (
        <div key={s.h}>
          <h2>{s.h}</h2>
          {s.p?.map((t, i) => <p key={i}>{t}</p>)}
          {s.list ? <ul>{s.list.map((t, i) => <li key={i}>{t}</li>)}</ul> : null}
        </div>
      ))}
      <h2>Try it yourself</h2>
      <p><Link href="/">Open Scholar Lens</Link> to find the papers that answer your question, understand each one in depth, and get an evidence-based outlook for your project. It is free to start.</p>
      <p><Link href="/guides">More guides</Link></p>
    </Legal>
  );
}
