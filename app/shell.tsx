"use client";

import { useState } from "react";
import Papers from "./papers/page";
import Outlook from "./outlook/page";

const STEPS = [
  { n: "1", t: "Ask or describe", d: "Type a research question, or describe your project in plain language." },
  { n: "2", t: "We gather the evidence", d: "Scholar Lens searches millions of published papers and tracks how research activity changes year by year." },
  { n: "3", t: "Get a clear answer", d: "Ranked papers with one-tap summaries, or an outlook with opportunities, risks and scenarios. Sources are listed in every report." },
];
const AUDIENCE = ["Students", "Research teams", "Startups", "Analysts", "Consultants"];
const C: React.CSSProperties = { textAlign: "center", marginLeft: "auto", marginRight: "auto", maxWidth: "100%" };

export default function Shell() {
  const [tab, setTab] = useState<"papers" | "outlook">("outlook");

  return (
    <div className="sx">
      <style>{`
        .sx{--bg1:#f4f6ff;--bg2:#fafaf7;--card:#fff;--text:#1d2433;--muted:#667085;--line:#e4e7ec;--accent:#2f5bea;--accent2:#7c3aed;min-height:100vh;width:100%;box-sizing:border-box;background:linear-gradient(180deg,var(--bg1),var(--bg2) 420px);color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
        @media (prefers-color-scheme:dark){.sx{--bg1:#171c33;--bg2:#12151c;--card:#1b2030;--text:#eef1f7;--muted:#9aa4b8;--line:#2c3347;--accent:#7b9bff;--accent2:#b794f6}}
        .sx .sxwrap{max-width:900px;width:100%;box-sizing:border-box;margin:0 auto;padding:0 16px}
        .sx .sxnav{display:flex;align-items:center;justify-content:space-between;padding:18px 0}
        .sx .sxlogo{font-weight:800;font-size:1.15rem;letter-spacing:-.01em}.sx .sxlogo span{color:var(--accent)}
        .sx .sxpill{font-size:.75rem;border:1px solid var(--line);border-radius:999px;padding:4px 10px;color:var(--muted);background:var(--card)}
        .sx .sxhero{display:block;width:100%;box-sizing:border-box;text-align:center;padding:28px 0 8px;margin:0 auto}
        .sx .sxbadge{display:inline-block;font-size:.78rem;font-weight:600;color:var(--accent);background:var(--card);border:1px solid var(--line);border-radius:999px;padding:5px 12px}
        .sx .sxhl{font-size:clamp(1.9rem,6vw,3.1rem);line-height:1.1;margin:16px auto 12px;letter-spacing:-.025em;text-align:center}
        .sx .sxgrad{background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
        .sx .sxlead{max-width:600px;margin:0 auto 22px;color:var(--muted);font-size:1.05rem;line-height:1.5;text-align:center}
        .sx .sxtabs{display:inline-flex;gap:4px;padding:5px;border-radius:999px;background:var(--card);border:1px solid var(--line);box-shadow:0 4px 18px rgba(47,91,234,.12)}
        .sx .sxtabs button{border:0;background:none;color:var(--muted);font:inherit;font-weight:600;padding:10px 20px;border-radius:999px;cursor:pointer}
        .sx .sxtabs button.on{background:linear-gradient(90deg,var(--accent),var(--accent2));color:#fff}
        .sx .sxpanel{margin-top:18px;border:1px solid var(--line);border-radius:18px;background:var(--card);box-shadow:0 10px 40px rgba(29,36,51,.07);padding:4px 0}
        .sx .sxpanel .sl>.tag,.sx .sxpanel .sl>h1,.sx .sxpanel .sl>.sub{display:none}
        .sx .sxpanel .sl,.sx .sxpanel .ol{padding-top:20px}
        .sx .sxsec{text-align:center;font-size:1.5rem;margin:56px auto 18px;letter-spacing:-.01em}
        .sx .sxsteps{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
        .sx .sxstep{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
        .sx .sxnum{width:32px;height:32px;border-radius:50%;background:linear-gradient(90deg,var(--accent),var(--accent2));color:#fff;display:grid;place-items:center;font-weight:700;margin-bottom:10px}
        .sx .sxstep h3{margin:0 0 6px;font-size:1.05rem}.sx .sxstep p{margin:0;color:var(--muted);font-size:.92rem;line-height:1.45}
        .sx .sxaud{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
        .sx .sxaud span{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:8px 16px;font-weight:600;font-size:.9rem}
        .sx .sxfoot{margin:56px 0 0;padding:22px 0 40px;border-top:1px solid var(--line);color:var(--muted);font-size:.82rem;line-height:1.5;text-align:center}
      `}</style>

      <div className="sxwrap">
        <div className="sxnav">
          <div className="sxlogo">Scholar<span>Lens</span></div>
          <span className="sxpill">Beta</span>
        </div>

        <div className="sxhero" style={C}>
          <span className="sxbadge">AI research intelligence</span>
          <h1 className="sxhl" style={C}>See what research says, and <span className="sxgrad">what it means for what happens next</span></h1>
          <p className="sxlead" style={C}>Find the papers that truly answer your question, or describe your project and get an evidence-based outlook with opportunities, risks and scenarios.</p>
          <div className="sxtabs" role="tablist">
            <button className={tab === "papers" ? "on" : ""} onClick={() => setTab("papers")}>Find papers</button>
            <button className={tab === "outlook" ? "on" : ""} onClick={() => setTab("outlook")}>Project Outlook</button>
          </div>
        </div>

        <section className="sxpanel">{tab === "papers" ? <Papers /> : <Outlook />}</section>

        <h2 className="sxsec" style={C}>How it works</h2>
        <div className="sxsteps">
          {STEPS.map((s) => (
            <div className="sxstep" key={s.n}><div className="sxnum">{s.n}</div><h3>{s.t}</h3><p>{s.d}</p></div>
          ))}
        </div>

        <h2 className="sxsec" style={C}>Built for people who make decisions with research</h2>
        <div className="sxaud">{AUDIENCE.map((a) => <span key={a}>{a}</span>)}</div>

        <div className="sxfoot" style={C}>
          Scholar Lens gives informed outlooks based on published research. It cannot predict the future and is not financial, medical or legal advice. Always check the cited sources.
        </div>
      </div>
    </div>
  );
}
