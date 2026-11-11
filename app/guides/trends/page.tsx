"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "../../site-header";

type Point = { year: number; count: number };
type Proj = { year: number; mid: number; low: number; high: number; basis?: string };
type Backtest = { horizons: { h: number; n: number; rmse: number; medianPctError: number; naiveMedianPctError: number }[]; summary: string | null };
type Stats = { rawGrowthPct: number | null; relativeGrowthPct: number | null; signal: string };
type Sub = { name: string; recent: number; prior: number; shareChangePct: number | null };
type Topic = {
  query: string; counts: Point[]; totalPapers: number; stats: Stats; projection: Proj[] | null; backtest?: Backtest;
  subtopics: Sub[]; countries: { name: string; count: number }[];
};
type Result = { lastYear: number; topics: Topic[] };

const EXAMPLES: [string, string][] = [
  ["solid-state battery electrolytes", "perovskite solar cells"],
  ["AI tutoring", "adaptive learning"],
  ["CRISPR gene therapy", "mRNA vaccines"],
];

const SIGNAL: Record<string, string> = { rising: "Gaining ground", flat: "Holding steady", falling: "Losing share", unclear: "Not enough data" };
const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "n/a" : `${n > 0 ? "+" : ""}${n}%`);

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { return { error: "The server took too long or hit an error. Please try again." }; }
}

function Chart({ counts, projection }: { counts: Point[]; projection: Proj[] | null }) {
  const W = 640, H = 220, padB = 24, padT = 10;
  const proj = projection ?? [];
  const n = counts.length + proj.length;
  const max = Math.max(...counts.map((c) => c.count), ...proj.map((p) => p.high), 1);
  const bw = W / n;
  const y = (v: number) => padT + (H - padB - padT) * (1 - v / max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Papers published per year, with a rough projection">
      {counts.map((c, i) => (
        <g key={c.year}>
          <rect x={i * bw + 2} y={y(c.count)} width={Math.max(2, bw - 4)} height={Math.max(1, H - padB - y(c.count))} rx={2} fill="var(--data)" />
          <text x={i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">{`'${String(c.year).slice(2)}`}</text>
        </g>
      ))}
      {proj.map((p, j) => {
        const i = counts.length + j;
        const cx = i * bw + bw / 2;
        return (
          <g key={p.year}>
            <rect x={i * bw + 2} y={y(p.mid)} width={Math.max(2, bw - 4)} height={Math.max(1, H - padB - y(p.mid))} rx={2} fill="var(--accent)" fillOpacity={0.12} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="3 3" />
            <line x1={cx} x2={cx} y1={y(p.high)} y2={y(p.low)} stroke="var(--accent)" strokeWidth={1.6} />
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--muted)">{`~${String(p.year).slice(2)}`}</text>
          </g>
        );
      })}
    </svg>
  );
}

function compareLine(a: Topic, b: Topic): string {
  const x = a.stats.relativeGrowthPct;
  const y = b.stats.relativeGrowthPct;
  if (x === null || y === null) return "";
  if (Math.abs(x - y) < 5) return "Both topics are changing at a similar pace compared with all research.";
  const [f, s] = x > y ? [a, b] : [b, a];
  return `"${f.query}" is gaining share of all research faster than "${s.query}" (${fmt(f.stats.relativeGrowthPct)} vs ${fmt(s.stats.relativeGrowthPct)}, last 3 years against the 3 before).`;
}

export default function TrendExplorer() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function run(first = a, second = b) {
    const topics = [first.trim(), second.trim()].filter(Boolean);
    if (loading || topics.length === 0) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/trends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topics }) });
      const data = await readJson(res);
      if (!res.ok || data.error) setError(String(data.error ?? "Could not analyse these topics."));
      else setResult(data as unknown as Result);
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    setLoading(false);
  }

  const two = result && result.topics.length === 2;

  return (
    <>
    <SiteHeader />
    <main className="tr">
      <style>{`
        .tr{--accent2:var(--link);max-width:880px;margin:0 auto;padding:24px 20px 56px;color:var(--text);line-height:1.55}
        .tr a{color:var(--link)}
        .tr .kicker{color:var(--accent);font-size:.8rem;font-weight:600;}
        .tr h1{font-size:clamp(2.1rem,5.5vw,3.2rem);line-height:1.08;margin:8px 0 12px;letter-spacing:-.03em}
        .tr .lead{color:var(--muted);font-size:1.05rem;max-width:640px;margin:0 0 22px}
        .tr .form{display:grid;gap:10px;grid-template-columns:1fr 1fr auto;align-items:end}
        @media (max-width:640px){.tr .form{grid-template-columns:1fr}}
        .tr label{font-size:.8rem;font-weight:600;color:var(--muted);display:block;margin-bottom:4px}
        .tr input{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--text);font:inherit}
        .tr input:focus{outline:2px solid var(--accent);outline-offset:1px}
        .tr .go{background:var(--accent);color:var(--accent-ink);border:0;border-radius:12px;padding:12px 22px;font:inherit;font-weight:600;cursor:pointer;white-space:nowrap}
        .tr .go:disabled{opacity:.5;cursor:default}
        .tr .chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
        .tr .chip{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:999px;padding:6px 12px;font:inherit;font-size:.8rem;cursor:pointer}
        .tr .msg{margin-top:22px;color:var(--muted)}.tr .err{color:var(--danger)}
        .tr .verdict{margin-top:22px;padding:14px 16px;border:1px solid var(--line);border-left:4px solid var(--accent);border-radius:12px;background:var(--card);font-weight:600}
        .tr .grid{display:grid;gap:16px;margin-top:16px;grid-template-columns:1fr}
        .tr .card{padding:18px;border:1px solid var(--line);border-radius:16px;background:var(--card);box-shadow:var(--edge)}
        .tr .card h2{margin:0 0 8px;font-size:1.15rem;}
        .tr .stats{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
        .tr .pill{display:inline-block;font-size:.76rem;padding:3px 11px;border-radius:999px;background:var(--line);color:var(--text)}
        .tr .pill.big{background:var(--accent);color:var(--accent-ink);font-weight:600}
        .tr .chart{width:100%;height:auto;margin-top:6px}
        .tr .track{margin:10px 0;padding:10px 12px;border-left:3px solid var(--accent2);background:var(--bg,transparent);border-radius:6px;font-size:.86rem}
        .tr .m{color:var(--muted);font-size:.82rem}
        .tr h3{font-size:.9rem;margin:16px 0 6px}
        .tr ul{margin:0;padding-left:18px}.tr li{font-size:.88rem;margin-bottom:5px}
        .tr .two{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
        .tr .cta{margin-top:30px;padding:22px;border-radius:16px;background:var(--card-2);border:1px solid var(--line)}
        .tr .cta a.btn{display:inline-block;margin-top:8px;background:var(--accent);color:var(--accent-ink);border-radius:10px;padding:10px 18px;text-decoration:none;font-weight:600}
      `}</style>

            <h1>See which research topics are <span>really growing</span></h1>
      <p className="lead">Compare two topics side by side. We count papers per year, correct for the overall rise in publishing, and show fast-growing subtopics, leading countries and a simple 3-year projection.</p>

      <div className="form">
        <div><label htmlFor="a">Topic A</label><input id="a" value={a} onChange={(e) => setA(e.target.value)} placeholder="e.g. solid-state battery electrolytes" maxLength={120} /></div>
        <div><label htmlFor="b">Topic B (optional)</label><input id="b" value={b} onChange={(e) => setB(e.target.value)} placeholder="e.g. perovskite solar cells" maxLength={120} /></div>
        <button className="go" onClick={() => run()} disabled={loading || !a.trim()}>{loading ? "Analysing…" : "Compare"}</button>
      </div>
      <div className="chips">
        {EXAMPLES.map(([x, y]) => (
          <button key={x} type="button" className="chip" onClick={() => { setA(x); setB(y); run(x, y); }}>{x} vs {y}</button>
        ))}
      </div>

      {loading && <p className="msg">Counting papers across the last 12 years…</p>}
      {error && <p className="msg err">{error}</p>}

      {result && (
        <>
          {two ? <div className="verdict">{compareLine(result.topics[0], result.topics[1])}</div> : null}
          <div className="grid">
            {result.topics.map((t) => (
              <section className="card" key={t.query}>
                <h2>{t.query}</h2>
                <div className="stats">
                  <span className="pill big">{SIGNAL[t.stats.signal] ?? "Not enough data"}</span>
                  <span className="pill">Share of all research: {fmt(t.stats.relativeGrowthPct)}</span>
                  <span className="pill">Raw paper count: {fmt(t.stats.rawGrowthPct)}</span>
                  <span className="pill">{t.totalPapers.toLocaleString()} papers since {result.lastYear - 11}</span>
                </div>
                <Chart counts={t.counts} projection={t.projection} />
                <p className="m">Solid bars: papers per year. Faded bars with a line: a simple projection and range if the last six years&apos; trend continues. It is not a prediction.</p>
                {t.backtest?.summary ? (
                  <div className="track">
                    <strong>Track record</strong>
                    <div>{t.backtest.summary}</div>
                    <div className="m">The range above is sized from these real past misses, not guessed. Few past years exist, so treat it as rough.</div>
                  </div>
                ) : (
                  <p className="m">Not enough history for this topic to test the forecast against its own past, so the range is a rougher estimate.</p>
                )}

                <div className="two">
                  <div>
                    <h3>Subtopics (share of the field)</h3>
                    <ul>{t.subtopics.map((s) => <li key={s.name}><strong>{s.name}</strong> <span className="m">{s.recent.toLocaleString()} papers, {fmt(s.shareChangePct)}</span></li>)}</ul>
                  </div>
                  <div>
                    <h3>Leading countries (last 3 years)</h3>
                    <ul>{t.countries.map((c) => <li key={c.name}>{c.name} <span className="m">{c.count.toLocaleString()} papers</span></li>)}</ul>
                  </div>
                </div>
              </section>
            ))}
          </div>
          <p className="m">Data: OpenAlex. Paper counts show research attention, not market results or real-world outcomes. Share of all research compares the last 3 full years with the 3 before. Check original sources before relying on any figure.</p>
          <div className="cta">
            <strong>Want opportunities, risks and scenarios for your own project?</strong>
            <div className="m">Scholar Lens turns this data and recent papers into a full evidence-based outlook. Free to start.</div>
            <Link className="btn" href="/">Try Scholar Lens free</Link>
          </div>
        </>
      )}
      <p className="m" style={{ marginTop: 24 }}><Link href="/guides">← All guides</Link></p>
    </main>
    </>
  );
}
