"use client";

import { useState } from "react";
import Link from "next/link";
import Papers from "./papers/page";
import Outlook from "./outlook/page";

const TRUST = [
  "Every claim links to its source paper",
  "Open data from OpenAlex and Semantic Scholar",
  "Honest about limits: abstracts, not full texts",
  "Your reports saved to your own library",
];

const FEATURES = [
  { t: "Find the right papers", d: "Ask in plain language. Results from several scholarly sources are ranked by how well they answer your actual question." },
  { t: "Deep dive on any paper", d: "Study design, key findings, limitations, who cites it, related work and a link to the free full text when one exists." },
  { t: "Project Outlook", d: "Opportunities, risks and scenarios for your project, built from research activity data and recent papers." },
  { t: "Free trend explorer", d: "Compare how fast two research topics are growing, with fast-growing subtopics and a simple 3-year projection.", href: "/guides/trends" },
];

const STEPS = [
  { n: "1", t: "Ask or describe", d: "Type a research question, or describe your project in plain language." },
  { n: "2", t: "We gather the evidence", d: "Scholar Lens searches published papers and tracks how research activity changes year by year." },
  { n: "3", t: "Get a clear answer", d: "Ranked papers with deep dives, or an outlook with opportunities, risks and scenarios. Sources are listed in every report." },
];

const AUDIENCE = ["Students", "Research teams", "Startups", "Analysts", "Consultants"];
const BARS = [22, 26, 31, 38, 47, 58, 73, 91];

function Logo() {
  return (
    <span className="sxlogo">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <circle cx="11" cy="11" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <line x1="16.6" y1="16.6" x2="23" y2="23" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      Scholar<span>Lens</span>
    </span>
  );
}

export default function Shell() {
  const [tab, setTab] = useState<"papers" | "outlook">("outlook");

  return (
    <div className="sx">
      <style>{`
        .sx{--bg:#faf8f4;--card:#ffffff;--text:#1f1d1a;--muted:#6b665e;--line:#e7e2d9;--accent:#2f5bea;--accent2:#7c3aed;min-height:100vh;width:100%;color:var(--text);background:var(--bg);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
        @media (prefers-color-scheme:dark){.sx{--bg:#12151c;--card:#1b2030;--text:#eef1f7;--muted:#9aa4b8;--line:#2c3347;--accent:#7b9bff;--accent2:#b794f6}}
        .sx a{color:var(--accent)}
        .sx .sxwrap{max-width:1120px;width:100%;margin:0 auto;padding:0 20px}
        .sx .sxnav{display:flex;align-items:center;justify-content:space-between;padding:18px 0;border-bottom:1px solid var(--line)}
        .sx .sxlogo{display:inline-flex;align-items:center;gap:8px;font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:1.3rem;letter-spacing:-.01em;color:var(--text)}
        .sx .sxlogo span{color:var(--accent)}.sx .sxlogo svg{color:var(--accent)}
        .sx .sxlinks{display:flex;gap:20px;align-items:center;font-size:.92rem}
        .sx .sxlinks a{color:var(--muted);text-decoration:none}.sx .sxlinks a:hover{color:var(--text)}
        .sx .sxbeta{font-size:.72rem;border:1px solid var(--line);border-radius:999px;padding:3px 9px;color:var(--muted);background:var(--card)}
        .sx .sxhero{display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center;padding:64px 0 48px}
        @media (max-width:880px){.sx .sxhero{grid-template-columns:1fr;gap:32px;padding:36px 0 28px}}
        .sx .sxkick{font-size:.8rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--accent)}
        .sx .sxhl{font-family:Georgia,'Times New Roman',serif;font-weight:600;font-size:clamp(2.2rem,5vw,3.7rem);line-height:1.06;letter-spacing:-.025em;margin:14px 0 16px}
        .sx .sxgrad{background:linear-gradient(90deg,var(--accent),var(--accent2));-webkit-background-clip:text;background-clip:text;color:transparent}
        .sx .sxlead{font-size:1.12rem;line-height:1.6;color:var(--muted);max-width:520px;margin:0 0 26px}
        .sx .sxbtns{display:flex;gap:12px;flex-wrap:wrap}
        .sx .sxbtn{display:inline-block;padding:13px 24px;border-radius:12px;font-weight:600;text-decoration:none;font-size:.98rem}
        .sx .sxbtn.main{background:var(--accent);color:#fff}
        .sx .sxbtn.ghost{border:1px solid var(--line);color:var(--text);background:var(--card)}
        .sx .sxprev{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:20px;box-shadow:0 24px 70px rgba(31,29,26,.12)}
        .sx .sxprev .lab{font-size:.7rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
        .sx .sxprev h3{margin:8px 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:1.1rem;line-height:1.3}
        .sx .sxprev .sig{display:inline-block;background:linear-gradient(90deg,var(--accent),var(--accent2));color:#fff;border-radius:999px;font-size:.74rem;font-weight:600;padding:3px 12px}
        .sx .sxprev .bars{display:flex;align-items:flex-end;gap:6px;height:84px;margin:16px 0 4px}
        .sx .sxprev .bar{flex:1;border-radius:4px 4px 0 0;background:var(--accent);opacity:.85}
        .sx .sxprev .yrs{display:flex;justify-content:space-between;font-size:.66rem;color:var(--muted);margin-bottom:12px}
        .sx .sxprev ul{margin:0;padding-left:18px}.sx .sxprev li{font-size:.86rem;line-height:1.45;margin-bottom:7px;color:var(--text)}
        .sx .sxprev .tg{display:inline-block;font-size:.66rem;padding:1px 8px;border-radius:999px;background:var(--line);color:var(--muted);margin-left:4px;white-space:nowrap}
        .sx .sxprev .note{font-size:.72rem;color:var(--muted);margin-top:8px}
        .sx .sxtrust{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));padding:8px 0 4px}
        .sx .sxtrust div{font-size:.84rem;color:var(--muted);border-top:2px solid var(--line);padding-top:10px}
        .sx .sxtool{padding:56px 0 8px;scroll-margin-top:16px}
        .sx .sxtoolhead{text-align:center;margin-bottom:18px}
        .sx .sxtoolhead h2{font-family:Georgia,'Times New Roman',serif;font-size:clamp(1.6rem,3.5vw,2.2rem);margin:0 0 6px}
        .sx .sxtoolhead p{margin:0 0 18px;color:var(--muted)}
        .sx .sxtabs{display:inline-flex;gap:4px;padding:5px;border-radius:999px;background:var(--card);border:1px solid var(--line)}
        .sx .sxtabs button{border:0;background:none;color:var(--muted);font-weight:600;padding:10px 22px;border-radius:999px}
        .sx .sxtabs button.on{background:var(--accent);color:#fff}
        .sx .sxpanel{margin-top:6px}
        .sx .sxpanel .sl>.tag,.sx .sxpanel .sl>h1,.sx .sxpanel .sl>.sub{display:none}
        .sx .sxpanel .sl,.sx .sxpanel .ol{padding-top:12px}
        .sx .sxsec{font-family:Georgia,'Times New Roman',serif;font-size:clamp(1.5rem,3vw,2rem);margin:72px 0 22px}
        .sx .sxfeat{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}
        .sx .sxfc{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px;text-decoration:none;color:inherit;display:block}
        .sx .sxfc h3{margin:0 0 8px;font-size:1.05rem}.sx .sxfc p{margin:0;color:var(--muted);font-size:.92rem;line-height:1.55}
        .sx .sxfc.link{border-color:var(--accent)}.sx .sxfc .go{display:inline-block;margin-top:12px;font-weight:600;font-size:.9rem;color:var(--accent)}
        .sx .sxsteps{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:24px}
        .sx .sxnum{font-family:Georgia,'Times New Roman',serif;font-size:2.4rem;line-height:1;color:var(--accent);margin-bottom:8px}
        .sx .sxstep h3{margin:0 0 6px;font-size:1.05rem}.sx .sxstep p{margin:0;color:var(--muted);font-size:.93rem;line-height:1.55}
        .sx .sxaud{display:flex;flex-wrap:wrap;gap:10px}
        .sx .sxaud span{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:9px 18px;font-weight:600;font-size:.92rem}
        .sx .sxcta{margin:72px 0 0;padding:40px 24px;border-radius:24px;background:#1d2433;color:#fff;text-align:center}
        .sx .sxcta h2{font-family:Georgia,'Times New Roman',serif;font-size:clamp(1.5rem,3vw,2.1rem);margin:0 0 8px;color:#fff}
        .sx .sxcta p{margin:0 0 20px;color:#c3cbe0}
        .sx .sxcta a.sxbtn{background:#fff;color:#1d2433}
        .sx .sxfoot{margin:48px 0 0;padding:22px 0 40px;border-top:1px solid var(--line);color:var(--muted);font-size:.82rem;line-height:1.55;max-width:760px}
      `}</style>

      <div className="sxwrap">
        <nav className="sxnav">
          <Logo />
          <div className="sxlinks">
            <Link href="/guides/trends">Trend explorer</Link>
            <Link href="/guides">Guides</Link>
            <span className="sxbeta">Beta</span>
          </div>
        </nav>

        <header className="sxhero">
          <div>
            <div className="sxkick">AI research intelligence</div>
            <h1 className="sxhl">See what research says, and <span className="sxgrad">what it means for what happens next</span></h1>
            <p className="sxlead">Find the papers that truly answer your question, understand each one in depth, or describe your project and get an evidence-based outlook with opportunities, risks and scenarios.</p>
            <div className="sxbtns">
              <a className="sxbtn main" href="#tool">Try it now</a>
              <Link className="sxbtn ghost" href="/guides/trends">Explore topic trends</Link>
            </div>
          </div>

          <aside className="sxprev" aria-label="Example outlook">
            <div className="lab">Illustration with sample data</div>
            <h3>Outlook: should our lab work on a fast-growing battery topic?</h3>
            <span className="sig">Signal: gaining ground</span>
            <div className="bars" aria-hidden="true">
              {BARS.map((v, i) => <div className="bar" key={i} style={{ height: `${v}%` }} />)}
            </div>
            <div className="yrs"><span>Papers per year</span><span>Recent years →</span></div>
            <ul>
              <li>Several subtopics are growing faster than the field overall. <span className="tg">evidence: strong</span></li>
              <li>More papers show research attention, not market success. <span className="tg">caveat</span></li>
              <li>Best, most likely and worst-case scenarios, with signs to watch. <span className="tg">inference</span></li>
            </ul>
            <div className="note">Your own outlook is built from live paper data for your topic.</div>
          </aside>
        </header>

        <div className="sxtrust">
          {TRUST.map((t) => <div key={t}>{t}</div>)}
        </div>

        <section id="tool" className="sxtool">
          <div className="sxtoolhead">
            <h2>Try Scholar Lens</h2>
            <p>Choose what you need, then ask your question.</p>
            <div className="sxtabs" role="tablist">
              <button className={tab === "papers" ? "on" : ""} onClick={() => setTab("papers")}>Find papers</button>
              <button className={tab === "outlook" ? "on" : ""} onClick={() => setTab("outlook")}>Project Outlook</button>
            </div>
          </div>
          <div className="sxpanel">{tab === "papers" ? <Papers /> : <Outlook />}</div>
        </section>

        <h2 className="sxsec">Everything in one place</h2>
        <div className="sxfeat">
          {FEATURES.map((f) =>
            f.href ? (
              <Link className="sxfc link" href={f.href} key={f.t}>
                <h3>{f.t}</h3><p>{f.d}</p><span className="go">Try it free →</span>
              </Link>
            ) : (
              <div className="sxfc" key={f.t}><h3>{f.t}</h3><p>{f.d}</p></div>
            ),
          )}
        </div>

        <h2 className="sxsec">How it works</h2>
        <div className="sxsteps">
          {STEPS.map((s) => (
            <div className="sxstep" key={s.n}><div className="sxnum">{s.n}</div><h3>{s.t}</h3><p>{s.d}</p></div>
          ))}
        </div>

        <h2 className="sxsec">Built for people who make decisions with research</h2>
        <div className="sxaud">{AUDIENCE.map((a) => <span key={a}>{a}</span>)}</div>

        <section className="sxcta">
          <h2>Ask your first question</h2>
          <p>Free to start. Every answer links back to its sources.</p>
          <a className="sxbtn" href="#tool">Get started</a>
        </section>

        <div className="sxfoot">
          Scholar Lens gives informed outlooks based on published research. It cannot predict the future and is not financial, medical or legal advice. Always check the cited sources.
        </div>
      </div>
    </div>
  );
}
