import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";

export default function Legal({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
    <SiteHeader />
    <main className="lg">
      <style>{`
        .lg{max-width:700px;margin:0 auto;padding:28px 20px 56px;color:var(--text);line-height:1.7}
        .lg a{color:var(--link)}.lg h1{font-size:clamp(2rem,5vw,2.8rem);margin:12px 0 6px}.lg h2{font-size:1.35rem;margin:36px 0 8px;padding-top:20px;border-top:1px solid var(--line)}
        .lg .u{color:var(--muted);font-size:.88rem;margin:0 0 20px}.lg p,.lg li{font-size:1rem;color:var(--text)}.lg li{margin-bottom:8px}.lg ul{padding-left:22px}
      `}</style>
      <h1>{title}</h1>
      <p className="u">Last updated: {updated}</p>
      {children}
    </main>
    </>
  );
}
