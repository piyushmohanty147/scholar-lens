"use client";

import { useEffect, useState } from "react";

type Item = { point?: string; why?: string; action?: string; sources?: string[]; strength?: string };
type Report = {
  summary?: string;
  bottomLine?: string;
  trends?: { name?: string; direction?: string; evidence?: string; sources?: string[] }[];
  consensus?: { point?: string; sources?: string[] }[];
  debates?: Item[];
  opportunities?: Item[];
  risks?: Item[];
  scenarios?: { name?: string; description?: string; likelihood?: string; confidence?: string; drivers?: string[]; signals?: string[] }[];
  timeline?: { period?: string; expect?: string }[];
  indicators?: { signal?: string; why?: string }[];
  nextActions?: (string | { action?: string; when?: string })[];
  questionsForExperts?: string[];
  glossary?: { term?: string; meaning?: string }[];
  readingList?: { source?: string; reason?: string }[];
  watch?: string[];
  gaps?: string[];
  caveat?: string;
};
type Stats = { rawGrowthPct: number | null; relativeGrowthPct: number | null; signal: string } | null;
type Trend = { query: string; counts: { year: number; count: number }[]; stats?: Stats };
type Source = { id: string; title: string; year: number | null; url: string | null };
type Group = { name: string; count: number };
type Subtopic = { name: string; recent: number; prior: number; shareChangePct: number | null };
type Landscape = { countries: Group[]; institutions: Group[]; journals: Group[]; funders: Group[] };
type Result = { report: Report; trends: Trend[]; subtopics?: Subtopic[]; landscape?: Landscape; sources: Source[]; horizon: string; papersAnalysed?: number };
type Saved = { id: string; project: string; audience: string; at: number; result: Result };

const AUDIENCES = [
  { key: "student", label: "Student", example: "I am a high school student doing a project on whether AI tutoring improves learning in math. What does research say?" },
  { key: "researcher", label: "Researcher", example: "Our lab is studying solid-state battery electrolytes and wants to know which directions are growing and which are risky over the next 3 years." },
  { key: "startup", label: "Startup", example: "We are building an investing-education app for first-time retail investors in India and want to know what research says about risks and opportunities." },
  { key: "finance", label: "Finance analyst", example: "We are assessing whether ESG-focused funds will keep attracting inflows, and what research says about their risk and return." },
  { key: "consultant", label: "Consultant", example: "Our client is a hospital network considering AI tools for patient triage. What does the research say about benefits and risks?" },
];
const HISTORY_KEY = "sl_outlook_history";

function loadHistory(): Saved[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Saved[]) : [];
  } catch { return []; }
}
function storeHistory(list: Saved[]) {
  try { window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}
async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { return { error: "The server took too long or hit an error. Please try again." }; }
}

export default function Outlook() {
  const [project, setProject] = useState("");
  const [horizon, setHorizon] = useState("3");
  const [audience, setAudience] = useState("researcher");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<Saved[]>([]);

  useEffect(() => { setHistory(loadHistory()); }, []);

  async function run() {
    if (loading || project.trim().length < 20) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/outlook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project, horizon, audience }) });
      const data = await readJson(res);
      if (!res.ok || data.error) setError(String(data.error ?? "Could not build the outlook."));
      else {
        const full = data as unknown as Result;
        setResult(full);
        const next = [{ id: String(Date.now()), project, audience, at: Date.now(), result: full }, ...history].slice(0, 10);
        setHistory(next);
        storeHistory(next);
      }
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    setLoading(false);
  }

  function open(h: Saved) { setProject(h.project); setAudience(h.audience); setResult(h.result); setError(""); }
  function clearHistory() { setHistory([]); storeHistory([]); }

  const r = result?.report;
  const cites = (ids?: string[]) => (ids && ids.length ? ` [${ids.join(", ")}]` : "");
  const example = AUDIENCES.find((a) => a.key === audience)?.example ?? "";
  const findSource = (id?: string) => result?.sources.find((s) => s.id === id);
  const list = (items?: Item[], actionLabel?: string) => (
    <ul>{items?.map((o, i) => (
      <li key={i}>
        <strong>{o.point}</strong> {o.why}{cites(o.sources)} <span className="str">evidence: {o.strength}</span>
        {o.action ? <div className="m"><strong>{actionLabel}:</strong> {o.action}</div> : null}
      </li>
    ))}</ul>
  );
  const groupList = (title: string, g?: Group[]) => (g && g.length ? (
    <div>
      <div className="m"><strong>{title}</strong></div>
      <ul>{g.map((x, i) => <li key={i}>{x.name} <span className="m">({x.count.toLocaleString()} papers)</span></li>)}</ul>
    </div>
  ) : null);
  const pct = (n: number | null | undefined) => (n === null || n === undefined ? "n/a" : `${n > 0 ? "+" : ""}${n}%`);
  const hasLandscape = !!result?.landscape && (result.landscape.countries.length + result.landscape.institutions.length + result.landscape.journals.length + result.landscape.funders.length > 0);

  return (
    <main className="ol">
      <style>{`
        .ol{--bg:#fafaf7;--card:#fff;--text:#1d2433;--muted:#667085;--line:#e4e7ec;--accent:#2f5bea;max-width:760px;margin:0 auto;padding:32px 16px 64px;color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
        @media (prefers-color-scheme:dark){.ol{--bg:#12151c;--card:#1b2030;--text:#eef1f7;--muted:#9aa4b8;--line:#2c3347;--accent:#7b9bff}}
        .ol h1{font-size:2rem;margin:4px 0}.ol h2{font-size:1.1rem;margin:0 0 8px}
        .ol .tag{color:var(--accent);font-size:.8rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
        .ol .sub{color:var(--muted);margin:0 0 20px}.ol a{color:var(--accent)}
        .ol textarea{width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--text);font:inherit;min-height:120px;resize:vertical}
        .ol select{padding:8px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit}
        .ol .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px}
        .ol .go{margin-left:auto;background:var(--accent);color:#fff;border:0;border-radius:10px;padding:10px 20px;font:inherit;font-weight:600;cursor:pointer}
        .ol .go:disabled{opacity:.5;cursor:default}
        .ol .aud{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 12px}
        .ol .aud button{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:999px;padding:7px 14px;font:inherit;font-size:.85rem;cursor:pointer}
        .ol .aud button.on{background:var(--accent);border-color:var(--accent);color:#fff}
        .ol .ex{display:block;margin-top:8px;border:1px dashed var(--line);background:none;color:var(--muted);border-radius:10px;padding:8px 12px;font:inherit;font-size:.82rem;cursor:pointer;text-align:left}
        .ol .msg{margin-top:24px;color:var(--muted)}.ol .err{color:#d92d20}
        .ol .box{margin-top:16px;padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
        .ol ul{margin:0;padding-left:20px}.ol li{margin-bottom:10px}.ol .m{color:var(--muted);font-size:.85rem}
        .ol .str{display:inline-block;font-size:.7rem;padding:1px 8px;border-radius:999px;background:var(--line);color:var(--muted);white-space:nowrap}
        .ol .chip{display:inline-block;font-size:.75rem;padding:2px 10px;border-radius:999px;background:var(--line);color:var(--text);margin:2px 6px 2px 0}
        .ol .bottom{margin-top:10px;padding:10px 12px;border-left:3px solid var(--accent);background:var(--bg);border-radius:6px;font-weight:600}
        .ol .two{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
        .ol .bars{display:flex;align-items:flex-end;gap:4px;height:60px;margin:6px 0}
        .ol .bar{flex:1;background:var(--accent);border-radius:3px 3px 0 0;min-height:2px}
        .ol .yrs{display:flex;gap:4px;font-size:.65rem;color:var(--muted)}.ol .yrs span{flex:1;text-align:center}
        .ol .ghost{background:none;border:1px solid var(--line);color:var(--text);border-radius:8px;padding:6px 12px;font:inherit;font-size:.85rem;cursor:pointer;margin-top:16px}
        .ol .hist{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line);color:var(--text);padding:8px 0;font:inherit;font-size:.88rem;cursor:pointer}
        @media print{.ol .noprint{display:none}}
      `}</style>

      <div className="tag">Project Outlook</div>
      <h1>What could happen next?</h1>
      <p className="sub">Describe your project. Get an evidence-based outlook with opportunities, risks and scenarios.</p>

      <div className="noprint">
        <strong>I am a…</strong>
        <div className="aud">
          {AUDIENCES.map((a) => (
            <button key={a.key} type="button" className={audience === a.key ? "on" : ""} onClick={() => setAudience(a.key)}>{a.label}</button>
          ))}
        </div>
        <label htmlFor="p"><strong>Your project</strong></label>
        <textarea id="p" value={project} onChange={(e) => setProject(e.target.value)} placeholder="Describe what you are working on and what you want to know." />
        <button type="button" className="ex" onClick={() => setProject(example)}>Try an example: {example}</button>
        <div className="row">
          <label>Time horizon{" "}
            <select value={horizon} onChange={(e) => setHorizon(e.target.value)}>
              <option value="1">1 year</option><option value="3">3 years</option><option value="5">5 years</option>
            </select>
          </label>
          <button className="go" onClick={run} disabled={loading || project.trim().length < 20}>{loading ? "Analysing…" : "Build outlook"}</button>
        </div>
      </div>

      {loading && <p className="msg">Gathering evidence and writing your outlook. This can take 30 to 60 seconds…</p>}
      {error && <p className="msg err">{error}</p>}

      {r && result && (
        <>
          <div className="box">
            <h2>Summary ({result.horizon}-year outlook)</h2>
            <p style={{ margin: 0 }}>{r.summary}</p>
            {r.bottomLine ? <div className="bottom">Bottom line: {r.bottomLine}</div> : null}
            <p className="m" style={{ marginBottom: 0 }}>Based on {result.papersAnalysed ?? result.sources.length} papers and research-activity data from OpenAlex.</p>
          </div>

          <div className="box">
            <h2>Research activity (papers per year)</h2>
            {result.trends.filter((t) => t.counts.length).map((t) => {
              const max = Math.max(...t.counts.map((c) => c.count), 1);
              return (
                <div key={t.query} style={{ marginBottom: 14 }}>
                  <div className="m">{t.query}</div>
                  <div className="bars">{t.counts.map((c) => <div key={c.year} className="bar" title={`${c.year}: ${c.count}`} style={{ height: `${(c.count / max) * 100}%` }} />)}</div>
                  <div className="yrs">{t.counts.map((c) => <span key={c.year}>{String(c.year).slice(2)}</span>)}</div>
                  {t.stats ? (
                    <div>
                      <span className="chip">Signal: {t.stats.signal}</span>
                      <span className="chip">Share of all research: {pct(t.stats.relativeGrowthPct)}</span>
                      <span className="chip">Raw paper count: {pct(t.stats.rawGrowthPct)}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
            <ul>{r.trends?.map((t, i) => <li key={i}><strong>{t.name}</strong> ({t.direction}): {t.evidence}{cites(t.sources)}</li>)}</ul>
            <p className="m" style={{ marginBottom: 0 }}>Share of all research removes the general growth in publishing. Paper counts show research attention, not market results.</p>
          </div>

          {result.subtopics && result.subtopics.length > 0 && (
            <div className="box">
              <h2>Subtopics inside this field</h2>
              <ul>{result.subtopics.map((s, i) => (
                <li key={i}><strong>{s.name}</strong> <span className="m">{s.recent.toLocaleString()} papers in the last 3 years (was {s.prior.toLocaleString()}) · share of field {pct(s.shareChangePct)}</span></li>
              ))}</ul>
              <p className="m" style={{ marginBottom: 0 }}>A positive share change means the subtopic is growing faster than the field as a whole.</p>
            </div>
          )}

          {r.consensus && r.consensus.length > 0 && (
            <div className="box"><h2>What the research agrees on</h2>
              <ul>{r.consensus.map((c, i) => <li key={i}>{c.point}{cites(c.sources)}</li>)}</ul></div>
          )}
          {r.debates && r.debates.length > 0 && (
            <div className="box"><h2>Open debates</h2>{list(r.debates)}</div>
          )}

          <div className="box"><h2>Opportunities</h2>{list(r.opportunities, "How to act")}</div>
          <div className="box"><h2>Risks and possible losses</h2>{list(r.risks, "How to reduce it")}
            <p className="m" style={{ marginBottom: 0 }}>Evidence labels: strong = several sources agree; moderate = one clear source or clear data; weak = loosely related; inference = the AI&apos;s own reasoning. S = paper, D = research-activity data.</p></div>

          <div className="box"><h2>Scenarios</h2>
            <ul>{r.scenarios?.map((s, i) => (
              <li key={i}>
                <strong>{s.name}</strong> (likelihood: {s.likelihood}, confidence: {s.confidence}): {s.description}
                {s.drivers && s.drivers.length > 0 ? <div className="m"><strong>Drivers:</strong> {s.drivers.join("; ")}</div> : null}
                {s.signals && s.signals.length > 0 ? <div className="m"><strong>Signs it is happening:</strong> {s.signals.join("; ")}</div> : null}
              </li>
            ))}</ul></div>

          {r.timeline && r.timeline.length > 0 && (
            <div className="box"><h2>Timeline</h2>
              <ul>{r.timeline.map((t, i) => <li key={i}><strong>{t.period}:</strong> {t.expect}</li>)}</ul></div>
          )}
          {r.indicators && r.indicators.length > 0 && (
            <div className="box"><h2>Indicators to track</h2>
              <ul>{r.indicators.map((t, i) => <li key={i}><strong>{t.signal}</strong> {t.why}</li>)}</ul></div>
          )}

          {hasLandscape && (
            <div className="box">
              <h2>Who is doing the research</h2>
              <div className="two">
                {groupList("Countries", result.landscape?.countries)}
                {groupList("Institutions", result.landscape?.institutions)}
                {groupList("Journals", result.landscape?.journals)}
                {groupList("Funders", result.landscape?.funders)}
              </div>
              <p className="m" style={{ marginBottom: 0 }}>Counts are papers published in the last 3 years on your core topic.</p>
            </div>
          )}

          <div className="box"><h2>Next actions</h2>
            <ul>{r.nextActions?.map((a, i) => {
              const text = typeof a === "string" ? a : a.action;
              const when = typeof a === "string" ? "" : a.when;
              return <li key={i}>{when ? <strong>{when}: </strong> : null}{text}</li>;
            })}</ul></div>

          {r.questionsForExperts && r.questionsForExperts.length > 0 && (
            <div className="box"><h2>Questions to ask experts</h2>
              <ul>{r.questionsForExperts.map((q, i) => <li key={i}>{q}</li>)}</ul></div>
          )}
          <div className="box"><h2>What to watch</h2><ul>{r.watch?.map((w, i) => <li key={i}>{w}</li>)}</ul></div>
          {r.gaps && r.gaps.length > 0 && (
            <div className="box"><h2>What this evidence does not cover</h2>
              <ul>{r.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul></div>
          )}
          {r.glossary && r.glossary.length > 0 && (
            <div className="box"><h2>Glossary</h2>
              <ul>{r.glossary.map((g, i) => <li key={i}><strong>{g.term}:</strong> {g.meaning}</li>)}</ul></div>
          )}

          <div className="box"><h2>Reading list</h2>
            <ul>{r.readingList?.map((x, i) => {
              const s = findSource(x.source);
              return <li key={i}>{s ? (s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> : s.title) : x.source}{s?.year ? ` (${s.year})` : ""}: {x.reason}</li>;
            })}</ul></div>
          <div className="box"><h2>All sources</h2><ul>{result.sources.map((s) => <li key={s.id}>[{s.id}] {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a> : s.title}{s.year ? ` (${s.year})` : ""}</li>)}</ul></div>
          <p className="m"><em>{r.caveat} This is an informed outlook based on published research, not a guarantee or financial advice.</em></p>
          <button className="ghost noprint" onClick={() => window.print()}>Print or save as PDF</button>
        </>
      )}

      {history.length > 0 && (
        <div className="box noprint">
          <h2>Recent reports (saved on this device)</h2>
          {history.map((h) => (
            <button key={h.id} type="button" className="hist" onClick={() => open(h)}>
              {h.project.slice(0, 70)}{h.project.length > 70 ? "…" : ""} <span className="m">· {new Date(h.at).toLocaleDateString()}</span>
            </button>
          ))}
          <button type="button" className="ghost" onClick={clearHistory}>Clear history</button>
        </div>
      )}
    </main>
  );
}
