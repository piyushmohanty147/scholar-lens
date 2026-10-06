"use client";

import { useState } from "react";

type Paper = {
  paperId: string; title: string; year: number | null; url: string | null; authors: string[];
  fieldsOfStudy: string[]; source: string; abstract: string; score: number; explanation: string;
};
type Summary = { coreClaim: string; method: string; keyResult: string; limitation: string };
type SummaryState = { status: "loading" | "done" | "error"; open: boolean; data?: Summary; error?: string };

const EXAMPLES = [
  "What are the newest approaches to treating antibiotic-resistant infections?",
  "How does social media use affect sleep and attention in teenagers?",
  "Which technologies are most promising for large-scale carbon capture?",
  "Does AI tutoring improve learning outcomes in secondary school math?",
];
const FINANCE_EXAMPLES = [
  "Herding behavior in retail investors during market downturns",
  "Do ESG ratings predict stock returns?",
  "What does the yield curve tell us about recessions?",
];

// Reads a reply safely: never crashes if the server sends plain text instead of JSON.
async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  try { return JSON.parse(text) as Record<string, unknown>; }
  catch { return { error: res.ok ? "Unexpected reply from the server." : "The server took too long or hit an error. Please try again." }; }
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [field, setField] = useState<"all" | "finance">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [summaries, setSummaries] = useState<Record<string, SummaryState>>({});

  async function search(q = question) {
    const text = q.trim();
    if (!text || loading) return;
    setLoading(true); setError(""); setPapers(null); setSummaries({});
    try {
      const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, field }) });
      const data = await readJson(res);
      if (!res.ok || data.error) setError(String(data.error ?? "Search failed."));
      else setPapers((data.papers as Paper[]) ?? []);
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    setLoading(false);
  }

  async function summarize(paper: Paper) {
    const current = summaries[paper.paperId];
    if (current?.data) { setSummaries({ ...summaries, [paper.paperId]: { ...current, open: !current.open } }); return; }
    if (current?.status === "loading") return;
    setSummaries((s) => ({ ...s, [paper.paperId]: { status: "loading", open: true } }));
    try {
      const res = await fetch("/api/summarize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: paper.title, abstract: paper.abstract }) });
      const data = await readJson(res);
      if (!res.ok || data.error) throw new Error(String(data.error ?? "Summary failed."));
      setSummaries((s) => ({ ...s, [paper.paperId]: { status: "done", open: true, data: data.summary as Summary } }));
    } catch (e) {
      setSummaries((s) => ({ ...s, [paper.paperId]: { status: "error", open: true, error: e instanceof Error ? e.message : "Summary failed." } }));
    }
  }

  const examples = field === "finance" ? FINANCE_EXAMPLES : EXAMPLES;

  return (
    <main className="sl">
      <style>{`
        .sl{--bg:#fafaf7;--card:#fff;--text:#1d2433;--muted:#667085;--line:#e4e7ec;--accent:#2f5bea;max-width:760px;margin:0 auto;padding:32px 16px 64px;color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
        @media (prefers-color-scheme:dark){.sl{--bg:#12151c;--card:#1b2030;--text:#eef1f7;--muted:#9aa4b8;--line:#2c3347;--accent:#7b9bff}}
        body{background:#fafaf7}@media (prefers-color-scheme:dark){body{background:#12151c}}
        .sl h1{font-size:2rem;margin:4px 0}.sl .tag{color:var(--accent);font-size:.8rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
        .sl .sub{color:var(--muted);margin:0 0 20px}
        .sl label{font-weight:600;font-size:.9rem}
        .sl textarea{width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--text);font:inherit;min-height:84px;resize:vertical}
        .sl .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px}
        .sl .seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}
        .sl .seg button{border:0;background:var(--card);color:var(--muted);padding:8px 14px;font:inherit;font-size:.85rem;cursor:pointer}
        .sl .seg button.on{background:var(--accent);color:#fff}
        .sl .go{margin-left:auto;background:var(--accent);color:#fff;border:0;border-radius:10px;padding:10px 20px;font:inherit;font-weight:600;cursor:pointer}
        .sl .go:disabled{opacity:.5;cursor:default}
        .sl .chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
        .sl .chip{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:999px;padding:6px 12px;font:inherit;font-size:.8rem;cursor:pointer;text-align:left}
        .sl .msg{margin-top:24px;color:var(--muted)}.sl .err{color:#d92d20}
        .sl .card{margin-top:14px;padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
        .sl .card h3{margin:0 0 6px;font-size:1.05rem;line-height:1.3}.sl .card h3 a{color:inherit;text-decoration:none}.sl .card h3 a:hover{text-decoration:underline}
        .sl .meta{color:var(--muted);font-size:.82rem}.sl .why{margin:8px 0 0;font-size:.92rem}
        .sl .badge{display:inline-block;margin-right:6px;padding:2px 8px;border-radius:999px;background:var(--line);font-size:.72rem;color:var(--text)}
        .sl .sum{margin-top:10px;background:none;border:1px solid var(--accent);color:var(--accent);border-radius:8px;padding:6px 12px;font:inherit;font-size:.85rem;cursor:pointer}
        .sl .panel{margin-top:10px;padding:12px;border-left:3px solid var(--accent);background:var(--bg);border-radius:6px;font-size:.9rem}
        .sl .panel p{margin:0 0 8px}.sl .panel p:last-child{margin:0}
      `}</style>

      <div className="tag">AI-powered paper discovery</div>
      <h1>Scholar Lens</h1>
      <p className="sub">Ask a research question. Find the papers that best answer it.</p>

      <label htmlFor="q">Research question</label>
      <textarea id="q" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. How does herding behavior affect retail investors?" />

      <div className="row">
        <div className="seg" role="group" aria-label="Field">
          <button type="button" className={field === "all" ? "on" : ""} onClick={() => setField("all")}>All fields</button>
          <button type="button" className={field === "finance" ? "on" : ""} onClick={() => setField("finance")}>Finance &amp; Economics</button>
        </div>
        <button className="go" onClick={() => search()} disabled={loading || !question.trim()}>{loading ? "Searching…" : "Find papers"}</button>
      </div>

      <div className="chips">
        {examples.map((ex) => (
          <button key={ex} type="button" className="chip" onClick={() => { setQuestion(ex); search(ex); }}>{ex}</button>
        ))}
      </div>

      {loading && <p className="msg">Searching and ranking papers. This can take 10 to 30 seconds…</p>}
      {error && <p className="msg err">{error}</p>}
      {!loading && !error && papers === null && <p className="msg">Your most relevant papers will appear here.</p>}
      {papers && papers.length === 0 && !loading && <p className="msg">No strongly relevant papers found. Try rewording your question.</p>}

      {papers?.map((p) => {
        const st = summaries[p.paperId];
        return (
          <article className="card" key={p.paperId}>
            <h3>{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer">{p.title}</a> : p.title}</h3>
            <div className="meta">
              {p.source && <span className="badge">{p.source}</span>}
              {[p.authors.slice(0, 4).join(", "), p.year].filter(Boolean).join(" · ")} · Relevance {p.score}/10
            </div>
            {p.explanation && <p className="why">{p.explanation}</p>}
            {p.abstract && (
              <button type="button" className="sum" onClick={() => summarize(p)}>
                {st?.status === "loading" ? "Summarizing…" : st?.data ? (st.open ? "Hide summary" : "Show summary") : "Summarize"}
              </button>
            )}
            {st?.open && st.status === "error" && <div className="panel err">{st.error}</div>}
            {st?.open && st.data && (
              <div className="panel">
                <p><strong>Core claim:</strong> {st.data.coreClaim}</p>
                <p><strong>Method:</strong> {st.data.method}</p>
                <p><strong>Key result:</strong> {st.data.keyResult}</p>
                <p><strong>Limitation:</strong> {st.data.limitation}</p>
              </div>
            )}
          </article>
        );
      })}
    </main>
  );
}
