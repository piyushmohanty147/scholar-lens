"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "../lib/supabase";

type Limit = { message: string; kind: string; plan: string };
type Rec = Record<string, unknown>;

const PUBLIC_PATHS = ["/privacy", "/terms", "/refund", "/contact"];
const LINKS: [string, string][] = [["Privacy", "/privacy"], ["Terms", "/terms"], ["Refunds", "/refund"], ["Contact", "/contact"]];

// The server routes read the sign-in token from this cookie.
function syncCookie(session: Session | null) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  if (session?.access_token) {
    const age = session.expires_at ? Math.max(60, session.expires_at - Math.floor(Date.now() / 1000)) : 3600;
    document.cookie = `sl_token=${session.access_token}; path=/; max-age=${age}; samesite=lax${secure}`;
  } else {
    document.cookie = `sl_token=; path=/; max-age=0; samesite=lax${secure}`;
  }
}

// Daily usage resets at midnight UTC.
function resetInfo(now: number) {
  const d = new Date(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  const mins = Math.max(1, Math.ceil((next - now) / 60000));
  const at = new Date(next).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return { left: `${Math.floor(mins / 60)}h ${mins % 60}m`, at };
}

const str = (x: unknown) => (typeof x === "string" ? x : "");
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const obj = (x: unknown): Rec => (x && typeof x === "object" ? (x as Rec) : {});

// Saves every finished outlook to the signed-in user's library.
async function saveReport(userId: string, requestBody: string, data: Rec) {
  try {
    const body = JSON.parse(requestBody) as Rec;
    const project = str(body.project).trim();
    if (!project || !data.report) return;
    await supabase.from("saved_reports").insert({
      user_id: userId, project, audience: str(body.audience), horizon: str(body.horizon), result: data,
    });
  } catch { /* saving is best effort */ }
}

// Saves every paper the user opens with Deep dive.
async function savePaper(userId: string, requestBody: string, data: Rec) {
  try {
    const body = JSON.parse(requestBody) as Rec;
    const paperId = str(body.paperId);
    const title = str(body.title).trim();
    if (!paperId || !title) return;
    const meta = obj(data.meta);
    const analysis = obj(data.analysis);
    const authors = arr(meta.authors).map((a) => str(obj(a).name)).filter(Boolean);
    const oa = obj(meta.openAccess);
    const link = str(oa.url) || (paperId.startsWith("http") ? paperId : "");
    await supabase.from("saved_papers").upsert(
      {
        user_id: userId, paper_id: paperId, title,
        year: typeof meta.year === "number" ? meta.year : null,
        authors, venue: str(meta.venue) || null, url: link || null,
        summary: str(analysis.plainSummary) || null,
      },
      { onConflict: "user_id,paper_id" },
    );
  } catch { /* saving is best effort */ }
}

function Landing({ box }: { box: ReactNode }) {
  return (
    <div className="wrap">
      <div className="tag">AI research intelligence</div>
      <h1>Scholar Lens</h1>
      <p className="sub">Find the papers that truly answer your question, understand them in depth, and get an evidence-based outlook for your project.</p>
      {box}

      <section className="sec">
        <h2>What you get</h2>
        <div className="feat">
          <div className="fc"><h3>Find the right papers</h3><p>Ask a research question in plain language. Scholar Lens searches several scholarly sources and ranks papers by how well they answer your question.</p></div>
          <div className="fc"><h3>Deep dive on any paper</h3><p>Get a plain-language summary, study design, key findings, strengths, limitations, who cites it, related papers and a link to the free full text when one exists.</p></div>
          <div className="fc"><h3>Project Outlook</h3><p>Describe your project and get opportunities, risks, scenarios and indicators to track, grounded in research activity data and recent papers.</p></div>
          <div className="fc"><h3>Your library</h3><p>Every outlook and paper you study is saved to your account. Export reports as documents and your papers as BibTeX citations.</p></div>
        </div>
      </section>

      <section className="sec">
        <h2>How it works</h2>
        <ol>
          <li>Type your research question or describe your project.</li>
          <li>We gather papers and research-activity data from open scholarly sources.</li>
          <li>AI ranks and explains the evidence, and every claim points back to its sources.</li>
        </ol>
      </section>

      <section className="sec">
        <h2>Who it is for</h2>
        <p>Students writing projects, researchers scanning a new field, startup teams checking what research says, and analysts and consultants who need a fast evidence-based view.</p>
      </section>

      <section className="sec">
        <h2>Questions</h2>
        <details><summary>Is it free?</summary><p>You can start free, with daily limits on searches, deep dives and project outlooks. Paid plans with higher limits are coming.</p></details>
        <details><summary>Where does the information come from?</summary><p>Paper data comes from open scholarly sources such as OpenAlex and Semantic Scholar. AI is used to rank papers and to write summaries and outlooks.</p></details>
        <details><summary>How accurate is it?</summary><p>Deep dives are written from each paper&apos;s abstract and public data, not the full text, and AI can make mistakes. Always check the original paper before relying on a detail.</p></details>
        <details><summary>Is the outlook financial or professional advice?</summary><p>No. Outlooks show what published research suggests. Research activity is not the same as real-world or market outcomes.</p></details>
      </section>
    </div>
  );
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [limit, setLimit] = useState<Limit | null>(null);
  const [now, setNow] = useState(Date.now());
  const [joined, setJoined] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { sessionRef.current = session; }, [session]);

  useEffect(() => {
    if (!supabaseConfigured) { setReady(true); return; }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      syncCookie(data.session);
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      syncCookie(s);
      setSession(s);
      setReady(true);
    });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  // Closes the account menu when you tap outside it or press Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Watches replies from our own API: shows the limit window and saves finished results to the library.
  useEffect(() => {
    const original = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await original(...args);
      try {
        const [input, init] = args;
        const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
        const body = init?.body;
        const userId = sessionRef.current?.user.id;
        if (res.ok && userId && init?.method === "POST" && typeof body === "string") {
          if (url.includes("/api/outlook")) {
            res.clone().json().then((d) => saveReport(userId, body, obj(d))).catch(() => {});
          } else if (url.includes("/api/paper-detail")) {
            res.clone().json().then((d) => savePaper(userId, body, obj(d))).catch(() => {});
          }
        }
      } catch { /* never block the real request */ }
      if (res.status === 429) {
        try {
          const data = (await res.clone().json()) as { code?: string; error?: string; kind?: string; plan?: string };
          if (data.code === "limit_reached") setLimit({ message: data.error ?? "You have reached today's limit.", kind: data.kind ?? "uses", plan: data.plan ?? "free" });
        } catch { /* not our reply */ }
      }
      return res;
    };
    return () => { window.fetch = original; };
  }, []);

  useEffect(() => {
    if (!limit) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [limit]);

  async function google() {
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) { setMsg(error.message); setBusy(false); }
  }

  async function emailLink() {
    const value = email.trim();
    if (!value.includes("@")) { setMsg("Enter a valid email address."); return; }
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.signInWithOtp({ email: value, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    setMsg(error ? error.message : "Check your inbox for a sign-in link.");
  }

  async function signOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    syncCookie(null);
    setSession(null);
  }

  async function joinWaitlist() {
    if (!session) return;
    setJoinMsg("");
    const { error } = await supabase.from("waitlist").insert({ user_id: session.user.id, email: session.user.email });
    if (!error || error.code === "23505") setJoined(true);
    else setJoinMsg("Could not save that right now. Please try again.");
  }

  const styles = `
    .ag{--card:#fff;--text:#1d2433;--muted:#667085;--line:#e4e7ec;--accent:#2f5bea;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--text)}
    @media (prefers-color-scheme:dark){.ag{--card:#1b2030;--text:#eef1f7;--muted:#9aa4b8;--line:#2c3347;--accent:#7b9bff}}
    body{background:#fafaf7}@media (prefers-color-scheme:dark){body{background:#12151c}}
    .ag .wrap{max-width:640px;margin:0 auto;padding:56px 16px 24px;text-align:center}
    .ag h1{font-size:2rem;margin:4px 0}.ag .tag{color:var(--accent);font-size:.8rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
    .ag .sub{color:var(--muted);margin:8px 0 24px}
    .ag .box{max-width:460px;margin:0 auto;padding:20px;border:1px solid var(--line);border-radius:14px;background:var(--card);text-align:left}
    .ag .btn{display:block;width:100%;box-sizing:border-box;border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:10px;padding:12px;font:inherit;font-weight:600;cursor:pointer}
    .ag .btn.main{background:var(--accent);border-color:var(--accent);color:#fff}
    .ag .btn:disabled{opacity:.6;cursor:default}
    .ag input{width:100%;box-sizing:border-box;margin:12px 0 8px;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--text);font:inherit}
    .ag .or{text-align:center;color:var(--muted);font-size:.8rem;margin:14px 0 2px}
    .ag .msg{margin:12px 0 0;font-size:.88rem;color:var(--muted)}
    .ag .small{margin-top:14px;font-size:.78rem;color:var(--muted);text-align:center}
    .ag .sec{margin-top:40px;text-align:left}.ag .sec h2{font-size:1.2rem;margin:0 0 10px}
    .ag .sec p,.ag .sec li{font-size:.94rem;color:var(--muted);line-height:1.55}.ag .sec ol{padding-left:20px;margin:0}
    .ag .feat{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
    .ag .fc{border:1px solid var(--line);border-radius:12px;background:var(--card);padding:14px}
    .ag .fc h3{margin:0 0 6px;font-size:.98rem}.ag .fc p{margin:0;font-size:.86rem}
    .ag details{border-bottom:1px solid var(--line);padding:10px 0}.ag summary{cursor:pointer;font-weight:600;font-size:.94rem}
    .ag details p{margin:8px 0 0}
    .ag .foot{max-width:760px;margin:28px auto 0;padding:16px;display:flex;gap:14px;flex-wrap:wrap;justify-content:center;font-size:.8rem;color:var(--muted);border-top:1px solid var(--line)}
    .ag .foot a{color:var(--muted)}
    .ag .bar{max-width:760px;margin:0 auto;padding:12px 16px 0;display:flex;justify-content:flex-end;position:relative}
    .ag .avatar{width:38px;height:38px;border-radius:50%;border:2px solid var(--line);background:linear-gradient(135deg,#5b7cff,#a37bff);color:#fff;font:inherit;font-weight:700;font-size:1rem;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
    .ag .avatar:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
    .ag .menu{position:absolute;right:16px;top:58px;z-index:40;width:250px;max-width:calc(100vw - 32px);background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.35);overflow:hidden}
    .ag .menu .who{padding:14px 16px;border-bottom:1px solid var(--line)}
    .ag .menu .who b{display:block;font-size:.95rem;word-break:break-word}
    .ag .menu .who span{display:block;font-size:.8rem;color:var(--muted);word-break:break-all;margin-top:2px}
    .ag .menu a,.ag .menu button{display:block;width:100%;box-sizing:border-box;text-align:left;padding:12px 16px;background:none;border:0;color:var(--text);font:inherit;font-size:.92rem;text-decoration:none;cursor:pointer}
    .ag .menu a:hover,.ag .menu button:hover{background:var(--line)}
    .ag .menu .sep{border-top:1px solid var(--line)}
    .ag .shade{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;z-index:50}
    .ag .modal{max-width:440px;width:100%;max-height:90vh;overflow:auto;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
    .ag .modal h2{margin:0 0 6px;font-size:1.3rem}
    .ag .modal p{margin:0 0 12px;color:var(--muted);font-size:.92rem}
    .ag .modal ul{margin:0 0 16px;padding-left:20px;font-size:.92rem}.ag .modal li{margin-bottom:6px}
    .ag .clock{display:inline-block;padding:4px 12px;border-radius:999px;background:var(--line);font-size:.82rem;margin-bottom:14px}
    .ag .modal .btn{margin-top:8px}
  `;

  const footer = (
    <footer className="foot">
      {LINKS.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
      <span>© {new Date().getFullYear()} Scholar Lens</span>
    </footer>
  );

  // Legal pages are public: no sign-in needed.
  if (PUBLIC_PATHS.includes(pathname ?? "")) {
    return (
      <div className="ag">
        <style>{styles}</style>
        {children}
        {footer}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="ag">
        <style>{styles}</style>
        <Landing box={null} />
        {footer}
      </div>
    );
  }

  if (!session) {
    const box = (
      <>
        <div className="box">
          {!supabaseConfigured ? (
            <p className="msg">Sign-in is not set up yet. The site owner needs to add the Supabase keys.</p>
          ) : (
            <>
              <button className="btn main" onClick={google} disabled={busy}>Continue with Google</button>
              <div className="or">or use your email</div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              <button className="btn" onClick={emailLink} disabled={busy}>Email me a sign-in link</button>
              {msg ? <p className="msg">{msg}</p> : null}
            </>
          )}
        </div>
        <p className="small">New here? Either option creates your account automatically. Already registered? Use the same option to sign back in.</p>
        <p className="small">Free to start. Results are based on published research and are not financial or professional advice.</p>
      </>
    );
    return (
      <div className="ag">
        <style>{styles}</style>
        <Landing box={box} />
        {footer}
      </div>
    );
  }

  const reset = resetInfo(now);
  const meta = obj(session.user.user_metadata);
  const userEmail = session.user.email ?? "";
  const name = str(meta.full_name) || str(meta.name);
  const initial = (name || userEmail || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="ag">
      <style>{styles}</style>
      <div className="bar" ref={menuRef}>
        <button type="button" className="avatar" aria-label="Account menu" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          {initial}
        </button>
        {menuOpen && (
          <div className="menu" role="menu">
            <div className="who">
              <b>{name || "Your account"}</b>
              <span>{userEmail}</span>
            </div>
            <Link href="/library" role="menuitem" onClick={() => setMenuOpen(false)}>My library</Link>
            <Link href="/contact" role="menuitem" onClick={() => setMenuOpen(false)}>Help and contact</Link>
            <Link href="/privacy" role="menuitem" onClick={() => setMenuOpen(false)}>Privacy policy</Link>
            <button type="button" className="sep" role="menuitem" onClick={signOut}>Sign out</button>
          </div>
        )}
      </div>
      {children}
      {footer}

      {limit && (
        <div className="shade" onClick={() => setLimit(null)}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>You have reached today&apos;s free limit</h2>
            <p>{limit.message}</p>
            <div className="clock">Free uses reset in {reset.left} (at {reset.at})</div>
            <p><strong>Scholar Lens Pro is coming soon:</strong></p>
            <ul>
              <li>Many more project outlooks, searches and deep dives every day</li>
              <li>Priority access to new features</li>
            </ul>
            {joined ? (
              <p><strong>You are on the waitlist. We will email you when Pro opens.</strong></p>
            ) : (
              <button className="btn main" onClick={joinWaitlist}>Join the Pro waitlist</button>
            )}
            {joinMsg ? <p className="msg">{joinMsg}</p> : null}
            <button className="btn" onClick={() => setLimit(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
