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

export default function Shell() {
  const [tab, setTab] = useState<"papers" | "outlook">("outlook");

  return (
    <div className="sh">
      <style>{`
        .sh{--bg1:#f4f6ff;--bg2:#fafaf7;--card:#fff;--text:#1d2433;--muted:#667085;--line:#e4e7ec;--accent:#2f5bea;--accent2:#7c3aed;min-height:100vh;background:linear-gradient(180deg,var(--bg1),var(--bg2) 420px);color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
        @media (prefers-color-scheme:dark){.sh{--bg1:#171c33;--bg2:#12151c;--card:#1b2030;--text:#eef1f7;--muted:#9aa4b8;--line:#2c3347;--accent:#7b9bff;--accent2:#b794f6}}
        .sh .wrap{max-width:900px;margin:0 auto;padding:0 16px}
        .sh nav{display:flex;align-items:center;justify-content:space-between;padding:18px 0}
        .sh .logo{font-weight:800;font-size:1.15rem;letter-spacing:-.01em}.sh .logo span{color:var(--accent)}
        .sh .pill{font-size:.75rem;border:1px solid var(--line);border-radius:999px;padding:4px 10px;color:var(--muted);background:var(--card)}
        .sh .hero{text-align:center;padding:28px 0 8px}
        .sh .badge{display:inline-block;font-size:.78rem;font-weight:600;color:var(--accent);background:var(--card);border:1px solid var(--line);border-radius:999px;padding:5px 12px}
        .sh h1.hl{font-size:clamp(1.9rem,6vw,3.1rem);line-height:1.1;margin:16px 0 12px;letter-spacing:-.025em}
        .sh .grad{background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
        .sh .lead{max-width:600px;margin:0 auto 22px;color:var(--muted);font-size:1.05rem;line-height:1.5}
        .sh .tabs{display:inline-flex;gap:4px;padding:5px;border-radius:999px;background:var(--card);border:1px solid var(--line);box-shadow:0 4px 18px rgba(47,91,234,.12)}
        .sh .tabs button{border:0;background:none;color:var(--muted);font:inherit;font-weight:600;padding:10px 20px;border-radius:999px;cursor:pointer}
        .sh .tabs button.on{background:linear-gradient(90deg,var(--accent),var(--accent2));color:#fff}
        .sh .panel{margin-top:18px;border:1px solid var(--line);border-radius:18px;background:var(--card);box-shadow:0 10px 40px rgba(29,36,51,.07);padding:4px 0}
        .sh .panel .sl>.tag,.sh .panel .sl>h1,.sh .panel .sl>.sub{display:none}
        .sh .panel .sl,.sh .panel .ol{padding-top:20px}
        .sh h2.sec{text-align:center;font-size:1.5rem;margin:56px 0 18px;letter-spacing:-.01em}
        .sh .steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
        .sh .step{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
        .sh .num{width:32px;height:32px;border-radius:50%;background:linear-gradient(90deg,var(--accent),var(--accent2));color:#fff;display:grid;place-items:center;font-weight:700;margin-bottom:10px}
        .sh .step h3{margin:0 0 6px;font-size:1.05rem}.sh .step p{margin:0;color:var(--muted);font-size:.92rem;line-height:1.45}
        .sh .aud{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
        .sh .aud span{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:8px 16px;font-weight:600;font-size:.9rem}
        .sh footer{margin:56px 0 0;padding:22px 0 40px;border-top:1px solid var(--line);color:var(--muted);font-size:.82rem;line-height:1.5;text-align:center}
      `}</style>

      <div className="wrap">
        <nav>
          <div className="logo">Scholar<span>Lens</span></div>
          <span className="pill">Beta</span>
        </nav>

        <header className="hero">
          <span className="badge">AI research intelligence</span>
          <h1 className="hl">See what research says, and <span className="grad">what it means for what happens next</span></h1>
          <p className="lead">Find the papers that truly answer your question, or describe your project and get an evidence-based outlook with opportunities, risks and scenarios.</p>
          <div className="tabs" role="tablist">
            <button className={tab === "papers" ? "on" : ""} onClick={() => setTab("papers")}>Find papers</button>
            <button className={tab === "outlook" ? "on" : ""} onClick={() => setTab("outlook")}>Project Outlook</button>
          </div>
        </header>

        <section className="panel">{tab === "papers" ? <Papers /> : <Outlook />}</section>

        <h2 className="sec">How it works</h2>
        <div className="steps">
          {STEPS.map((s) => (
            <div className="step" key={s.n}><div className="num">{s.n}</div><h3>{s.t}</h3><p>{s.d}</p></div>
          ))}
        </div>

        <h2 className="sec">Built for people who make decisions with research</h2>
        <div className="aud">{AUDIENCE.map((a) => <span key={a}>{a}</span>)}</div>

        <footer>
          Scholar Lens gives informed outlooks based on published research. It cannot predict the future and is not financial, medical or legal advice. Always check the cited sources.
        </footer>
      </div>
    </div>
  );
}
