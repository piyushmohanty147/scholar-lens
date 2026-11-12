"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "./site-header";
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

export default function Shell() {
  const [tab, setTab] = useState<"papers" | "outlook">("outlook");

  return (
    <div className="sx">
      <style>{`
        .sx{min-height:100vh;width:100%;color:var(--text);background:var(--bg)}
        .sx .sxwrap{max-width:var(--wrap);width:100%;margin:0 auto;padding:0 20px}

        .sx .sxtop{background:var(--bg);border-bottom:1px solid var(--line)}
        .sx .sxhero{display:grid;grid-template-columns:1.1fr .9fr;gap:56px;align-items:center;padding:56px 0 76px}
        @media (max-width:880px){.sx .sxhero{grid-template-columns:1fr;gap:36px;padding:28px 0 48px}}
        .sx .sxkick{font-size:.95rem;font-weight:600;color:var(--link)}
        .sx .sxhl{font-family:var(--font-display);font-weight:600;font-size:clamp(2.4rem,5.4vw,4.1rem);line-height:1.04;letter-spacing:-.03em;margin:14px 0 20px}
        .sx .sxlead{font-size:1.14rem;line-height:1.65;color:var(--muted);max-width:520px;margin:0 0 30px}
        .sx .sxbtns{display:flex;gap:12px;flex-wrap:wrap}
        .sx .sxbtn{display:inline-block;padding:14px 28px;border-radius:12px;font-weight:600;text-decoration:none;font-size:1rem}
        .sx .sxbtn.main{background:var(--accent);color:var(--accent-ink)}
        .sx .sxbtn.main:hover{filter:brightness(1.07)}
        .sx .sxbtn.ghost{border:1px solid var(--line);color:var(--text);background:var(--card)}
        .sx .sxbtn.ghost:hover{background:var(--card-2)}

        .sx .sxprev{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:26px;box-shadow:var(--shadow)}
        .sx .sxprev .lab{font-size:.8rem;color:var(--muted)}
        .sx .sxprev h3{margin:8px 0 12px;font-family:var(--font-display);font-weight:600;font-size:1.2rem;line-height:1.3;letter-spacing:-.01em}
        .sx .sxprev .sig{display:inline-block;background:var(--accent-soft);color:var(--accent);border:1px solid rgba(255,255,255,.28);border-radius:999px;font-size:.78rem;font-weight:600;padding:3px 12px}
        .sx .sxprev .bars{display:flex;align-items:flex-end;gap:7px;height:96px;margin:20px 0 6px}
        .sx .sxprev .bar{flex:1;border-radius:4px 4px 0 0;background:var(--data)}
        .sx .sxprev .bar:nth-last-child(-n+3){background:rgba(255,255,255,.08);outline:1.5px dashed var(--accent);outline-offset:-1.5px}
        .sx .sxprev .yrs{display:flex;justify-content:space-between;font-size:.72rem;color:var(--muted);margin-bottom:14px}
        .sx .sxprev ul{margin:0;padding-left:18px}.sx .sxprev li{font-size:.9rem;line-height:1.5;margin-bottom:8px;color:var(--text)}
        .sx .sxprev .tg{display:inline-block;font-size:.7rem;padding:1px 9px;border-radius:999px;background:var(--link-soft);color:var(--link);margin-left:4px;white-space:nowrap}
        .sx .sxprev .note{font-size:.76rem;color:var(--muted);margin-top:10px}

        .sx .sxtrust{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));padding:30px 0 8px}
        .sx .sxtrust div{font-size:.9rem;color:var(--muted);border-top:1px solid var(--line);padding-top:12px}

        .sx .sxband{background:var(--band);border-top:1px solid var(--line);border-bottom:1px solid var(--line);margin-top:52px;padding:60px 0 52px;scroll-margin-top:0}
        .sx .sxtoolhead{text-align:center;margin-bottom:14px}
        .sx .sxtoolhead h2{font-size:clamp(1.8rem,3.6vw,2.6rem);margin:0 0 8px}
        .sx .sxtoolhead p{margin:0 0 20px;color:var(--muted)}
        .sx .sxtabs{display:inline-flex;gap:4px;padding:5px;border-radius:999px;background:var(--card);border:1px solid var(--line)}
        .sx .sxtabs button{border:0;background:none;color:var(--muted);font-weight:600;padding:10px 24px;border-radius:999px}
        .sx .sxtabs button:hover:not(.on){color:var(--text)}
        .sx .sxtabs button.on{background:var(--accent);color:var(--accent-ink)}
        .sx .sxpanel .sl>.tag,.sx .sxpanel .sl>h1,.sx .sxpanel .sl>.sub{display:none}
        .sx .sxpanel .sl,.sx .sxpanel .ol{padding-top:14px}

        .sx .sxsec{font-size:clamp(1.7rem,3.2vw,2.3rem);margin:84px 0 24px}
        .sx .sxfeat{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
        .sx .sxfc{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px;text-decoration:none;color:inherit;display:block}
        .sx .sxfc:hover{border-color:var(--link)}
        .sx .sxfc h3{margin:0 0 8px;font-size:1.08rem}.sx .sxfc p{margin:0;color:var(--muted);font-size:.94rem;line-height:1.6}
        .sx .sxfc.link{border-color:rgba(255,255,255,.3)}.sx .sxfc .go{display:inline-block;margin-top:14px;font-weight:600;font-size:.92rem;color:var(--accent)}
        .sx .sxsteps{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:32px}
        .sx .sxnum{font-family:var(--font-display);font-size:2.8rem;line-height:1;color:var(--accent);margin-bottom:10px}
        .sx .sxstep h3{margin:0 0 6px;font-size:1.08rem}.sx .sxstep p{margin:0;color:var(--muted);font-size:.95rem;line-height:1.6}
        .sx .sxaud{display:flex;flex-wrap:wrap;gap:10px}
        .sx .sxaud span{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:9px 18px;font-weight:600;font-size:.92rem}

        .sx .sxcta{margin:88px 0 0;padding:52px 24px;border-radius:26px;background:var(--card-2);border:1px solid var(--line);text-align:center}
        .sx .sxcta h2{font-size:clamp(1.7rem,3.2vw,2.3rem);margin:0 0 8px}
        .sx .sxcta p{margin:0 0 24px;color:var(--muted)}
        .sx .sxcta a.sxbtn{background:var(--accent);color:var(--accent-ink)}
        .sx .sxfoot{margin:52px 0 0;padding:24px 0 48px;border-top:1px solid var(--line);color:var(--muted);font-size:.84rem;line-height:1.6}
      `}</style>

      <div className="sxtop">
        <SiteHeader />
        <div className="sxwrap">
          <div className="sxhero">
            <div>
              <div className="sxkick">AI research intelligence</div>
              <h1 className="sxhl">See what research says, and <span>what it means for what happens next</span></h1>
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
              <div className="yrs"><span>Papers per year</span><span>Dashed: projection</span></div>
              <ul>
                <li>Several subtopics are growing faster than the field overall. <span className="tg">evidence: strong</span></li>
                <li>More papers show research attention, not market success. <span className="tg">caveat</span></li>
                <li>Best, most likely and worst-case scenarios, with signs to watch. <span className="tg">inference</span></li>
              </ul>
              <div className="note">Your own outlook is built from live paper data for your topic.</div>
            </aside>
          </div>
        </div>
      </div>

      <div className="sxwrap">
        <div className="sxtrust">
          {TRUST.map((t) => <div key={t}>{t}</div>)}
        </div>
      </div>

      <section id="tool" className="sxband">
        <div className="sxwrap">
          <div className="sxtoolhead">
            <h2>Try Scholar Lens</h2>
            <p>Choose what you need, then ask your question.</p>
            <div className="sxtabs" role="tablist">
              <button className={tab === "papers" ? "on" : ""} onClick={() => setTab("papers")}>Find papers</button>
              <button className={tab === "outlook" ? "on" : ""} onClick={() => setTab("outlook")}>Project Outlook</button>
            </div>
          </div>
          <div className="sxpanel">{tab === "papers" ? <Papers /> : <Outlook />}</div>
        </div>
      </section>

      <div className="sxwrap">
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
