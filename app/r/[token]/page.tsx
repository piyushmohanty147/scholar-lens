"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Rec = Record<string, unknown>;
type Shared = { project: string; audience: string | null; horizon: string | null; created_at: string; result: Rec };

const str = (x: unknown) => (typeof x === "string" ? x : "");
const num = (x: unknown) => (typeof x === "number" ? x : null);
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const obj = (x: unknown): Rec => (x && typeof x === "object" ? (x as Rec) : {});
const strs = (x: unknown) => arr(x).map(str).filter(Boolean);
const cite = (x: unknown) => { const ids = strs(x); return ids.length ? ` [${ids.join(", ")}]` : ""; };

export default function SharedReport() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [data, setData] = useState<Shared | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: d, error } = await supabase.rpc("get_shared_report", { p_token: token });
      if (!alive) return;
      if (error || !d) { setState("missing"); return; }
      setData(d as Shared);
      setState("ready");
    })();
    return () => { alive = false; };
  }, [token]);

  const rep = obj(data?.result.report);
  const sources = arr(data?.result.sources).map(obj);
  const trends = arr(data?.result.trends).map(obj);
  const subtopics = arr(data?.result.subtopics).map(obj);

  const items = (list: unknown, actionLabel?: string) => (
    <ul>
      {arr(list).map(obj).map((i, k) => (
        <li key={k}>
          <strong>{str(i.point)}</strong> {str(i.why)}{cite(i.sources)}{str(i.strength) ? <span className="tagx">evidence: {str(i.strength)}</span> : null}
          {actionLabel && str(i.action) ? <div className="m"><strong>{actionLabel}:</strong> {str(i.action)}</div> : null}
        </li>
      ))}
    </ul>
  );
  const box = (title: string, show: boolean, body: React.ReactNode) => (show ? <section className="box"><h2>{title}</h2>{body}</section> : null);

  const nextActions = arr(rep.nextActions);

  return (
    <main className="sr">
      <style>{`
        .sr{--text:#1d2433;--muted:#667085;--line:#e4e7ec;--card:#fff;--accent:#2f5bea;max-width:760px;margin:0 auto;padding:24px 16px 40px;color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.55}
        @media (prefers-color-scheme:dark){.sr{--text:#eef1f7;--muted:#9aa4b8;--line:#2c3347;--card:#1b2030;--accent:#7b9bff}}
        .sr a{color:var(--accent)}.sr h1{font-size:1.7rem;margin:6px 0}.sr h2{font-size:1.05rem;margin:0 0 8px}
        .sr .brand{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--accent);padding-bottom:8px;margin-bottom:14px}
        .sr .brand b{font-size:1.1rem}.sr .brand span{color:var(--muted);font-size:.8rem}
        .sr .m{color:var(--muted);font-size:.85rem}.sr ul{margin:0;padding-left:20px}.sr li{margin-bottom:8px;font-size:.93rem}
        .sr .box{margin-top:14px;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--card);break-inside:avoid}
        .sr .tagx{display:inline-block;margin-left:6px;font-size:.7rem;padding:1px 8px;border-radius:999px;background:var(--line);color:var(--muted);white-space:nowrap}
        .sr .bottom{margin-top:10px;padding:10px 12px;border-left:3px solid var(--accent);font-weight:600}
        .sr .bars{display:flex;align-items:flex-end;gap:4px;height:50px;margin:6px 0}.sr .bar{flex:1;background:var(--accent);border-radius:3px 3px 0 0;min-height:2px}
        .sr .yrs{display:flex;gap:4px;font-size:.65rem;color:var(--muted)}.sr .yrs span{flex:1;text-align:center}
        .sr button{background:var(--accent);color:#fff;border:0;border-radius:8px;padding:8px 16px;font:inherit;font-weight:600;cursor:pointer;margin-top:16px}
        @media print{
          .sr{--text:#000;--muted:#444;--line:#ccc;--card:#fff;--accent:#2f5bea;padding:0}
          body{background:#fff !important}.sr button,.foot{display:none !important}
        }
      `}</style>

      <div className="brand"><b>Scholar Lens</b><span>Evidence-based outlook</span></div>

      {state === "loading" && <p className="m">Loading report…</p>}
      {state === "missing" && (
        <section className="box">
          <h2>This report is not available</h2>
          <p>The link may be wrong, or the owner stopped sharing it. <Link href="/">Go to Scholar Lens</Link></p>
        </section>
      )}

      {state === "ready" && data && (
        <>
          <h1>Project outlook</h1>
          <p><strong>Project:</strong> {data.project}</p>
          <p className="m">{new Date(data.created_at).toLocaleDateString()}{data.horizon ? ` · ${data.horizon}-year horizon` : ""}{data.audience ? ` · written for: ${data.audience}` : ""}</p>

          {box("Summary", Boolean(str(rep.summary)), <><p style={{ margin: 0 }}>{str(rep.summary)}</p>{str(rep.bottomLine) ? <div className="bottom">Bottom line: {str(rep.bottomLine)}</div> : null}</>)}

          {box("Research activity (papers per year)", trends.some((t) => arr(t.counts).length > 0), <>
            {trends.filter((t) => arr(t.counts).length > 0).map((t, k) => {
              const counts = arr(t.counts).map(obj).map((c) => ({ year: num(c.year) ?? 0, count: num(c.count) ?? 0 }));
              const max = Math.max(...counts.map((c) => c.count), 1);
              return (
                <div key={k} style={{ marginBottom: 12 }}>
                  <div className="m">{str(t.query)}</div>
                  <div className="bars">{counts.map((c) => <div key={c.year} className="bar" style={{ height: `${(c.count / max) * 100}%` }} />)}</div>
                  <div className="yrs">{counts.map((c) => <span key={c.year}>{String(c.year).slice(2)}</span>)}</div>
                </div>
              );
            })}
            <ul>{arr(rep.trends).map(obj).map((t, k) => <li key={k}><strong>{str(t.name)}</strong> ({str(t.direction)}): {str(t.evidence)}{cite(t.sources)}</li>)}</ul>
            <p className="m" style={{ marginBottom: 0 }}>Paper counts show research attention, not market results.</p>
          </>)}

          {box("Subtopics", subtopics.length > 0, <ul>{subtopics.map((s, k) => <li key={k}><strong>{str(s.name)}</strong> <span className="m">{num(s.recent)?.toLocaleString()} papers in the last 3 years (was {num(s.prior)?.toLocaleString()})</span></li>)}</ul>)}
          {box("What the research agrees on", arr(rep.consensus).length > 0, <ul>{arr(rep.consensus).map(obj).map((c, k) => <li key={k}>{str(c.point)}{cite(c.sources)}</li>)}</ul>)}
          {box("Open debates", arr(rep.debates).length > 0, items(rep.debates))}
          {box("Opportunities", arr(rep.opportunities).length > 0, items(rep.opportunities, "How to act"))}
          {box("Risks and possible losses", arr(rep.risks).length > 0, items(rep.risks, "How to reduce it"))}
          {box("Scenarios", arr(rep.scenarios).length > 0, <ul>{arr(rep.scenarios).map(obj).map((s, k) => (
            <li key={k}>
              <strong>{str(s.name)}</strong> (likelihood: {str(s.likelihood)}, confidence: {str(s.confidence)}): {str(s.description)}
              {strs(s.drivers).length ? <div className="m"><strong>Drivers:</strong> {strs(s.drivers).join("; ")}</div> : null}
              {strs(s.signals).length ? <div className="m"><strong>Signs it is happening:</strong> {strs(s.signals).join("; ")}</div> : null}
            </li>
          ))}</ul>)}
          {box("Timeline", arr(rep.timeline).length > 0, <ul>{arr(rep.timeline).map(obj).map((t, k) => <li key={k}><strong>{str(t.period)}:</strong> {str(t.expect)}</li>)}</ul>)}
          {box("Indicators to track", arr(rep.indicators).length > 0, <ul>{arr(rep.indicators).map(obj).map((t, k) => <li key={k}><strong>{str(t.signal)}</strong> {str(t.why)}</li>)}</ul>)}
          {box("Next actions", nextActions.length > 0, <ul>{nextActions.map((a, k) => {
            if (typeof a === "string") return <li key={k}>{a}</li>;
            const o = obj(a);
            return <li key={k}>{str(o.when) ? <strong>{str(o.when)}: </strong> : null}{str(o.action)}</li>;
          })}</ul>)}
          {box("Questions to ask experts", strs(rep.questionsForExperts).length > 0, <ul>{strs(rep.questionsForExperts).map((q, k) => <li key={k}>{q}</li>)}</ul>)}
          {box("What this evidence does not cover", strs(rep.gaps).length > 0, <ul>{strs(rep.gaps).map((q, k) => <li key={k}>{q}</li>)}</ul>)}
          {box("Glossary", arr(rep.glossary).length > 0, <ul>{arr(rep.glossary).map(obj).map((g, k) => <li key={k}><strong>{str(g.term)}:</strong> {str(g.meaning)}</li>)}</ul>)}
          {box("Sources", sources.length > 0, <ul>{sources.map((s, k) => <li key={k}>[{str(s.id)}] {str(s.url) ? <a href={str(s.url)} target="_blank" rel="noopener noreferrer">{str(s.title)}</a> : str(s.title)}{num(s.year) ? ` (${num(s.year)})` : ""}</li>)}</ul>)}

          <p className="m"><em>{str(rep.caveat) || "Research activity is not the same as real-world outcomes."} This is an informed outlook based on published research, not a guarantee or financial advice. Created with Scholar Lens (scholar-lens-emc5.vercel.app).</em></p>
          <button onClick={() => window.print()}>Print or save as PDF</button>
          <p className="m"><Link href="/">Make your own outlook with Scholar Lens</Link></p>
        </>
      )}
    </main>
  );
}
