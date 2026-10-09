"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "../lib/supabase";

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

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

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
    await supabase.auth.signOut();
    syncCookie(null);
    setSession(null);
  }

  const styles = `
    .ag{--card:#fff;--text:#1d2433;--muted:#667085;--line:#e4e7ec;--accent:#2f5bea;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:var(--text)}
    @media (prefers-color-scheme:dark){.ag{--card:#1b2030;--text:#eef1f7;--muted:#9aa4b8;--line:#2c3347;--accent:#7b9bff}}
    .ag .wrap{max-width:460px;margin:0 auto;padding:64px 16px;text-align:center}
    .ag h1{font-size:2rem;margin:4px 0}.ag .tag{color:var(--accent);font-size:.8rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
    .ag .sub{color:var(--muted);margin:8px 0 24px}
    .ag .box{padding:20px;border:1px solid var(--line);border-radius:14px;background:var(--card);text-align:left}
    .ag .btn{display:block;width:100%;box-sizing:border-box;border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:10px;padding:12px;font:inherit;font-weight:600;cursor:pointer}
    .ag .btn.main{background:var(--accent);border-color:var(--accent);color:#fff}
    .ag .btn:disabled{opacity:.6;cursor:default}
    .ag input{width:100%;box-sizing:border-box;margin:12px 0 8px;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--text);font:inherit}
    .ag .or{text-align:center;color:var(--muted);font-size:.8rem;margin:14px 0 2px}
    .ag .msg{margin:12px 0 0;font-size:.88rem;color:var(--muted)}
    .ag .small{margin-top:18px;font-size:.78rem;color:var(--muted);text-align:center}
    .ag .bar{max-width:760px;margin:0 auto;padding:10px 16px 0;display:flex;justify-content:flex-end;align-items:center;gap:10px;font-size:.8rem;color:var(--muted)}
    .ag .bar button{background:none;border:1px solid var(--line);color:var(--text);border-radius:8px;padding:4px 10px;font:inherit;font-size:.8rem;cursor:pointer}
  `;

  if (!ready) {
    return (
      <div className="ag">
        <style>{styles}</style>
        <div className="wrap">
          <div className="tag">AI research intelligence</div>
          <h1>Scholar Lens</h1>
          <p className="sub">Find the papers that truly answer your question, understand them in depth, and get an evidence-based outlook for your project.</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="ag">
        <style>{styles}</style>
        <div className="wrap">
          <div className="tag">AI research intelligence</div>
          <h1>Scholar Lens</h1>
          <p className="sub">Find the papers that truly answer your question, understand them in depth, and get an evidence-based outlook for your project.</p>
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
          <p className="small">Free to start. Results are based on published research and are not financial or professional advice.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ag">
      <style>{styles}</style>
      <div className="bar">
        <span>{session.user.email}</span>
        <button onClick={signOut}>Sign out</button>
      </div>
      {children}
    </div>
  );
}
