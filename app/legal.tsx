import type { ReactNode } from "react";
import Link from "next/link";

export default function Legal({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="lg">
      <style>{`
        .lg{--text:#1d2433;--muted:#667085;--line:#e4e7ec;--accent:#2f5bea;max-width:720px;margin:0 auto;padding:32px 16px 40px;color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.6}
        @media (prefers-color-scheme:dark){.lg{--text:#eef1f7;--muted:#9aa4b8;--line:#2c3347;--accent:#7b9bff}}
        body{background:#fafaf7}@media (prefers-color-scheme:dark){body{background:#12151c}}
        .lg a{color:var(--accent)}.lg h1{font-size:1.8rem;margin:16px 0 4px}.lg h2{font-size:1.1rem;margin:26px 0 6px}
        .lg .u{color:var(--muted);font-size:.85rem;margin:0 0 16px}.lg p,.lg li{font-size:.95rem}.lg ul{padding-left:22px}
      `}</style>
      <p><Link href="/">← Back to Scholar Lens</Link></p>
      <h1>{title}</h1>
      <p className="u">Last updated: {updated}</p>
      {children}
    </main>
  );
}
