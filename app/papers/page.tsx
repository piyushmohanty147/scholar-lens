"use client";

import { safeUrl } from "../../lib/safeUrl";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type Paper = {
  paperId: string; title: string; year: number | null; url: string | null; authors: string[];
  fieldsOfStudy: string[]; source: string; abstract: string; score: number; explanation: string;
};
type AuthorHit = { id: string; name: string; institution: string; worksCount: number; citedBy: number };
type AuthorInfo = { author: AuthorHit; others: AuthorHit[]; total: number; page: number; hasMore: boolean };
type Suggest = { authors: { id: string; name: string; hint: string; worksCount: number }[]; works: { id: string; title: string; hint: string }[] };
type Analysis = {
  plainSummary?: string; background?: string; researchQuestion?: string;
  studyDesign?: { type?: string; sample?: string; methods?: string };
  keyFindings?: string[]; numbers?: string[]; whyItMatters?: string; howItAnswersYourQuestion?: string;
  strengths?: string[]; limitations?: string[]; whoShouldRead?: string;
  concepts?: { term?: string; meaning?: string }[]; questionsToAsk?: string[];
  reliability?: { level?: string; reason?: string };
};
type Link = { title: string; year: number | null; citations: number; url: string | null };
type Meta = {
  citations: number; references: number; year: number | null; type: string; venue: string;
  openAccess: { isOa: boolean; pdfUrl: string | null; url: string | null };
  topics: string[]; keywords: string[]; authors: { name: string; institution: string }[];
  citationsByYear: { year: number; count: number }[]; related: Link[]; citedBy: Link[];
};
type Detail = { analysis: Analysis; meta: Meta };
type DetailState = { status: "loading" | "done" | "error"; open: boolean; data?: Detail; error?: string };

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

function citation(p: Paper) {
  const a = p.authors.slice(0, 3).join(", ") + (p.authors.length > 3 ? " et al." : "");
  return `${a ? a + ". " : ""}${p.year ? `(${p.year}). ` : ""}${p.title}.${p.url ? " " + p.url : ""}`;
}

function List({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;
  return <ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div className="sec"><h4>{title}</h4>{children}</div>;
}
function Links({ title, items }: { title: string; items: Link[] }) {
  if (items.length === 0) return null;
  return (
    <Section title={title}>
      <ul>{items.map((x, i) => (
        <li key={i}>
          {safeUrl(x.url) ? <a href={safeUrl(x.url) ?? "#"} target="_blank" rel="noopener noreferrer">{x.title}</a> : x.title}
          <span className="meta"> {x.year ? `(${x.year})` : ""} {x.citations ? `· ${x.citations.toLocaleString()} citations` : ""}</span>
        </li>
      ))}</ul>
    </Section>
  );
}

function DetailView({ d }: { d: Detail }) {
  const a = d.analysis;
  const m = d.meta;
  const years = m.citationsByYear.slice(-10);
  const max = Math.max(...years.map((y) => y.count), 1);
  const oaUrl = m.openAccess.pdfUrl ?? m.openAccess.url;
  return (
    <div className="panel">
      <div className="facts">
        <span className="badge">{m.citations.toLocaleString()} citations</span>
        <span className="badge">{m.references.toLocaleString()} references</span>
        {m.type ? <span className="badge">{m.type}</span> : null}
        {m.venue ? <span className="badge">{m.venue}</span> : null}
        {a.reliability?.level ? <span className="badge">reliability: {a.reliability.level}</span> : null}
        {safeUrl(oaUrl) ? <a className="oa" href={safeUrl(oaUrl) ?? "#"} target="_blank" rel="noopener noreferrer">Read free full text</a> : <span className="badge">no free full text found</span>}
      </div>

      {a.plainSummary ? <Section title="In plain language"><p>{a.plainSummary}</p></Section> : null}
      {a.howItAnswersYourQuestion ? <Section title="How it answers your question"><p>{a.howItAnswersYourQuestion}</p></Section> : null}
      {a.background ? <Section title="Background"><p>{a.background}</p></Section> : null}
      {a.researchQuestion ? <Section title="Research question"><p>{a.researchQuestion}</p></Section> : null}
      {a.studyDesign ? (
        <Section title="Study design">
          <ul>
            {a.studyDesign.type ? <li><strong>Type:</strong> {a.studyDesign.type}</li> : null}
            {a.studyDesign.sample ? <li><strong>Sample:</strong> {a.studyDesign.sample}</li> : null}
            {a.studyDesign.methods ? <li><strong>Methods:</strong> {a.studyDesign.methods}</li> : null}
          </ul>
        </Section>
      ) : null}
      {a.keyFindings && a.keyFindings.length > 0 ? <Section title="Key findings"><List items={a.keyFindings} /></Section> : null}
      {a.numbers && a.numbers.length > 0 ? <Section title="Numbers reported"><List items={a.numbers} /></Section> : null}
      {a.whyItMatters ? <Section title="Why it matters"><p>{a.whyItMatters}</p></Section> : null}
      {a.strengths && a.strengths.length > 0 ? <Section title="Strengths"><List items={a.strengths} /></Section> : null}
      {a.limitations && a.limitations.length > 0 ? <Section title="Limitations"><List items={a.limitations} /></Section> : null}
      {a.reliability?.reason ? <Section title="How far to trust it"><p>{a.reliability.reason}</p></Section> : null}
      {a.whoShouldRead ? <Section title="Who should read it"><p>{a.whoShouldRead}</p></Section> : null}
      {a.concepts && a.concepts.length > 0 ? (
        <Section title="Key concepts">
          <ul>{a.concepts.map((c, i) => <li key={i}><strong>{c.term}:</strong> {c.meaning}</li>)}</ul>
        </Section>
      ) : null}
      {a.questionsToAsk && a.questionsToAsk.length > 0 ? <Section title="Questions to ask while reading"><List items={a.questionsToAsk} /></Section> : null}

      {m.authors.length > 0 ? (
        <Section title="Authors">
          <ul>{m.authors.map((x, i) => <li key={i}>{x.name}{x.institution ? <span className="meta"> · {x.institution}</span> : null}</li>)}</ul>
        </Section>
      ) : null}
      {m.topics.length > 0 ? <Section title="Topics"><p>{m.topics.join(" · ")}</p></Section> : null}

      {years.length > 1 ? (
        <Section title="Citations per year">
          <div className="bars">{years.map((y) => <div key={y.year} className="bar" title={`${y.year}: ${y.count}`} style={{ height: `${(y.count / max) * 100}%` }} />)}</div>
          <div className="yrs">{years.map((y) => <span key={y.year}>{String(y.year).slice(2)}</span>)}</div>
        </Section>
      ) : null}

      <Links title="Most-cited papers that build on this one" items={m.citedBy} />
      <Links title="Related papers" items={m.related} />
      <p className="meta">Analysis is based on the abstract and public metadata, not the full text. Check the original paper before relying on any detail.</p>
    </div>
  );
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [field, setField] = useState<"all" | "finance">("all");
  const [sort, setSort] = useState<"relevance" | "newest">("relevance");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [details, setDetails] = useState<Record<string, DetailState>>({});
  const [copied, setCopied] = useState("");
  const [author, setAuthor] = useState<AuthorInfo | null>(null);
  const [sug, setSug] = useState<Suggest | null>(null);
  const [showSug, setShowSug] = useState(false);
  const skipSuggest = useRef(false);

  // Suggestions while typing (after a short pause, 3+ letters). Never blocks searching.
  useEffect(() => {
    if (skipSuggest.current) { skipSuggest.current = false; return; }
    const q = question.trim();
    if (q.length < 3 || q.length > 80 || q.includes("\n")) { setSug(null); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q }) });
        if (res.ok) setSug((await res.json()) as Suggest);
      } catch { /* suggestions are optional */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [question]);

  async function search(q = question, opts: { authorId?: string; page?: number } = {}) {
    const text = q.trim();
    if (!text || loading) return;
    const more = (opts.page ?? 1) > 1;
    setLoading(true); setError(""); setAsked(text);
    if (!more) { setPapers(null); setDetails({}); setAuthor(null); }
    try {
      const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, field, authorId: opts.authorId, page: opts.page }) });
      const data = await readJson(res);
      if (!res.ok || data.error) setError(String(data.error ?? "Search failed."));
      else {
        const list = (data.papers as Paper[]) ?? [];
        setPapers((prev) => (more && prev ? [...prev, ...list.filter((p) => !prev.some((x) => x.paperId === p.paperId))] : list));
        const a = data.author as AuthorHit | undefined;
        setAuthor(a ? { author: a, others: (data.others as AuthorHit[]) ?? [], total: Number(data.total ?? 0), page: Number(data.page ?? 1), hasMore: Boolean(data.hasMore) } : null);
      }
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    setLoading(false);
  }

  async function dive(paper: Paper) {
    const current = details[paper.paperId];
    if (current?.data) { setDetails({ ...details, [paper.paperId]: { ...current, open: !current.open } }); return; }
    if (current?.status === "loading") return;
    setDetails((s) => ({ ...s, [paper.paperId]: { status: "loading", open: true } }));
    try {
      const res = await fetch("/api/paper-detail", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId: paper.paperId, title: paper.title, abstract: paper.abstract, question: asked }),
      });
      const data = await readJson(res);
      if (!res.ok || data.error) throw new Error(String(data.error ?? "Deep dive failed."));
      setDetails((s) => ({ ...s, [paper.paperId]: { status: "done", open: true, data: data as unknown as Detail } }));
    } catch (e) {
      setDetails((s) => ({ ...s, [paper.paperId]: { status: "error", open: true, error: e instanceof Error ? e.message : "Deep dive failed." } }));
    }
  }

  async function copyCite(p: Paper) {
    try {
      await navigator.clipboard.writeText(citation(p));
      setCopied(p.paperId);
      setTimeout(() => setCopied(""), 1500);
    } catch { /* ignore */ }
  }

  const examples = field === "finance" ? FINANCE_EXAMPLES : EXAMPLES;
  const shown = papers ? [...papers].sort((a, b) => (sort === "newest" ? (b.year ?? 0) - (a.year ?? 0) : b.score - a.score)) : null;

  return (
    <main className="sl">
      <style>{`
        .sl{max-width:760px;margin:0 auto;padding:32px 16px 64px;color:var(--text);}
        .sl h1{font-size:2rem;margin:4px 0}.sl .tag{color:var(--accent);font-size:.8rem;font-weight:600;}
        .sl .sub{color:var(--muted);margin:0 0 20px}.sl a{color:var(--link)}
        .sl label{font-weight:600;font-size:.9rem}
        .sl textarea{width:100%;box-sizing:border-box;margin-top:6px;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--text);font:inherit;min-height:84px;resize:vertical}
        .sl .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px}
        .sl .seg{display:inline-flex;border:1px solid var(--line);border-radius:999px;overflow:hidden}
        .sl .seg button{border:0;background:var(--card);color:var(--muted);padding:8px 14px;font:inherit;font-size:.85rem;cursor:pointer}
        .sl .seg button.on{background:var(--accent);color:var(--accent-ink)}
        .sl .go{margin-left:auto;background:var(--accent);color:var(--accent-ink);border:0;border-radius:10px;padding:10px 20px;font:inherit;font-weight:600;cursor:pointer}
        .sl .go:disabled{opacity:.5;cursor:default}
        .sl .chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
        .sl .chip{border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:999px;padding:6px 12px;font:inherit;font-size:.8rem;cursor:pointer;text-align:left}
        .sl .msg{margin-top:24px;color:var(--muted)}.sl .sug{margin-top:4px;border:1px solid var(--line);border-radius:12px;background:var(--card);overflow:hidden}.sl .sug button{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line);padding:10px 14px;color:var(--text);font:inherit;font-size:.9rem;cursor:pointer}.sl .sug button:last-child{border-bottom:0}.sl .sug button:hover{background:var(--accent-soft)}.sl .sug span{color:var(--muted);font-size:.82rem}.sl .authorbox{margin-top:20px;border:1px solid var(--line);border-radius:12px;background:var(--card);padding:12px 14px;display:grid;gap:8px}.sl .authorbox .note{color:var(--muted);font-size:.9rem;display:flex;flex-wrap:wrap;gap:8px;align-items:center}.sl .err{color:var(--danger)}
        .sl .card{margin-top:14px;padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--card)}
        .sl .card h3{margin:0 0 6px;font-size:1.05rem;line-height:1.3}.sl .card h3 a{color:inherit;text-decoration:none}.sl .card h3 a:hover{text-decoration:underline}
        .sl .meta{color:var(--muted);font-size:.82rem}.sl .why{margin:8px 0 0;font-size:.92rem}
        .sl .badge{display:inline-block;margin:0 6px 6px 0;padding:2px 8px;border-radius:999px;background:var(--fill);font-size:.72rem;color:var(--text)}
        .sl .oa{display:inline-block;margin:0 6px 6px 0;padding:2px 10px;border-radius:999px;background:var(--accent);color:var(--accent-ink);font-size:.72rem;text-decoration:none}
        .sl .acts{display:flex;gap:8px;flex-wrap:wrap}
        .sl .sum{margin-top:10px;background:none;border:1px solid var(--accent);color:var(--accent);border-radius:8px;padding:6px 12px;font:inherit;font-size:.85rem;cursor:pointer}
        .sl .sum.alt{border-color:var(--line);color:var(--text)}
        .sl .panel{margin-top:12px;padding:14px;border-left:3px solid var(--accent);background:var(--bg);border-radius:6px;font-size:.9rem}
        .sl .panel p{margin:0 0 8px}.sl .panel ul{margin:0;padding-left:20px}.sl .panel li{margin-bottom:6px}
        .sl .sec{margin-top:14px}.sl .sec h4{margin:0 0 4px;font-size:.88rem;color:var(--accent)}
        .sl .bars{display:flex;align-items:flex-end;gap:4px;height:50px;margin:6px 0}
        .sl .bar{flex:1;background:var(--data);border-radius:3px 3px 0 0;min-height:2px}
        .sl .yrs{display:flex;gap:4px;font-size:.65rem;color:var(--muted)}.sl .yrs span{flex:1;text-align:center}
        .sl .top{display:flex;justify-content:space-between;align-items:center;margin-top:20px;flex-wrap:wrap;gap:8px}
        .sl select{padding:6px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--text);font:inherit;font-size:.85rem}
      `}</style>

      <div className="tag">AI-powered paper discovery</div>
      <h1>Scholar Lens</h1>
      <p className="sub">Ask a research question. Find the papers that best answer it, then understand each one in depth.</p>

      <label htmlFor="q">Research question</label>
      <textarea id="q" value={question} onChange={(e) => { setQuestion(e.target.value); setShowSug(true); }} onFocus={() => setShowSug(true)} onBlur={() => setTimeout(() => setShowSug(false), 200)} placeholder="Type a question, a paper title, a DOI or an author's name" />
      {showSug && sug && (sug.authors.length > 0 || sug.works.length > 0) && (
        <div className="sug" role="listbox" aria-label="Suggestions">
          {sug.authors.map((a) => (
            <button key={a.id} type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => { skipSuggest.current = true; setQuestion(a.name); setShowSug(false); search(a.name, { authorId: a.id }); }}>
              <strong>{a.name}</strong><span> Author{a.hint ? `, ${a.hint}` : ""}{a.worksCount ? ` · ${a.worksCount.toLocaleString()} works` : ""}</span>
            </button>
          ))}
          {sug.works.map((w) => (
            <button key={w.id} type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => { skipSuggest.current = true; setQuestion(w.title); setShowSug(false); search(w.title); }}>
              <strong>{w.title}</strong><span> Paper{w.hint ? `, ${w.hint}` : ""}</span>
            </button>
          ))}
        </div>
      )}

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

      {loading && <p className="msg">Searching several sources and ranking papers. This can take 10 to 40 seconds…</p>}
      {error && <p className="msg err">{error}</p>}
      {!loading && !error && papers === null && <p className="msg">Your most relevant papers will appear here.</p>}
      {papers && papers.length === 0 && !loading && <p className="msg">No strongly relevant papers found. Try rewording your question.</p>}

      {author && (
        <div className="authorbox">
          <p><strong>Papers by {author.author.name}</strong>{author.author.institution ? `, ${author.author.institution}` : ""}. Most cited first. Showing {papers?.length ?? 0} of {author.total.toLocaleString()}.</p>
          {author.others.length > 0 && (
            <p className="note">Not the right person?{" "}
              {author.others.map((o) => (
                <button key={o.id} type="button" className="chip" onClick={() => search(asked, { authorId: o.id })}>
                  {o.name}{o.institution ? `, ${o.institution}` : ""} ({o.worksCount.toLocaleString()} works)
                </button>
              ))}
            </p>
          )}
        </div>
      )}

      {shown && shown.length > 0 && (
        <div className="top">
          <span className="meta">{shown.length} papers found</span>
          <label className="meta">Sort by{" "}
            <select value={sort} onChange={(e) => setSort(e.target.value as "relevance" | "newest")}>
              <option value="relevance">Relevance</option>
              <option value="newest">Newest</option>
            </select>
          </label>
        </div>
      )}

      {shown?.map((p) => {
        const st = details[p.paperId];
        return (
          <article className="card" key={p.paperId}>
            <h3>{safeUrl(p.url) ? <a href={safeUrl(p.url) ?? "#"} target="_blank" rel="noopener noreferrer">{p.title}</a> : p.title}</h3>
            <div className="meta">
              {p.source && <span className="badge">{p.source}</span>}
              {[p.authors.slice(0, 4).join(", "), p.year].filter(Boolean).join(" · ")} {!author && <> · Relevance {p.score}/10</>}
            </div>
            {p.explanation && <p className="why">{p.explanation}</p>}
            <div className="acts">
              {p.abstract && (
                <button type="button" className="sum" onClick={() => dive(p)}>
                  {st?.status === "loading" ? "Analysing…" : st?.data ? (st.open ? "Hide deep dive" : "Show deep dive") : "Deep dive"}
                </button>
              )}
              <button type="button" className="sum alt" onClick={() => copyCite(p)}>{copied === p.paperId ? "Copied" : "Copy citation"}</button>
            </div>
            {st?.open && st.status === "error" && <div className="panel err">{st.error}</div>}
            {st?.open && st.data && <DetailView d={st.data} />}
          </article>
        );
      })}

      {author?.hasMore && !loading && (
        <p className="msg"><button type="button" className="sum" onClick={() => search(asked, { authorId: author.author.id, page: author.page + 1 })}>Show 50 more papers</button></p>
      )}
    </main>
  );
}
