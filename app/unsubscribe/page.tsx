"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { CONTACT_EMAIL } from "../../lib/site";

export default function Page() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const v = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { setMsg("Enter a valid email address."); return; }
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc("unsubscribe_email", { p_email: v });
    setBusy(false);
    setMsg(error
      ? `Could not unsubscribe right now. Please email ${CONTACT_EMAIL} and we will remove you.`
      : "Done. If that address was subscribed, it has been removed.");
  }

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ fontSize: "1.8rem", marginBottom: 8 }}>Unsubscribe</h1>
      <p style={{ color: "var(--muted)", marginBottom: 18 }}>Enter the email address that receives our research-trend emails and we will remove it.</p>
      <label htmlFor="unsub-email" style={{ display: "block", marginBottom: 6 }}>Email address</label>
      <input
        id="unsub-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10, border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", font: "inherit", marginBottom: 12 }}
      />
      <button type="button" className="btn main" disabled={busy} onClick={submit} style={{ width: "100%", padding: 13, borderRadius: 12, border: "1px solid var(--accent)", background: "var(--accent)", color: "var(--accent-ink)", font: "inherit", fontWeight: 600, cursor: "pointer" }}>
        Unsubscribe me
      </button>
      {msg && <p role="status" style={{ marginTop: 14 }}>{msg}</p>}
      <p style={{ marginTop: 24 }}><Link href="/privacy">Privacy Policy</Link></p>
    </main>
  );
}
