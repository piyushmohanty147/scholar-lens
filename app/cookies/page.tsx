import type { Metadata } from "next";
import Link from "next/link";
import Legal from "../legal";
import { CONTACT_EMAIL, LEGAL_UPDATED, SITE_NAME } from "../../lib/site";
export const metadata: Metadata = { title: "Cookie Policy | Scholar Lens", description: "The cookies and browser storage Scholar Lens uses." };
export default function Page() {
  return (
    <Legal title="Cookie Policy" updated={LEGAL_UPDATED}>
      <p>{SITE_NAME} only uses the cookies and browser storage it needs to run. We do not use advertising, analytics or tracking cookies, and we do not load third-party trackers or embedded content, so there is no cookie banner to accept. If that changes, we will ask for your permission first and update this page.</p>

      <h2>What we store on your device</h2>
      <ul>
        <li><strong>Sign-in cookie (sl_token):</strong> keeps you signed in. It is set only after you sign in, is not readable by scripts on the page, and expires with your sign-in session. Without it the site cannot work, so it does not need your consent.</li>
        <li><strong>Sign-in session in browser storage:</strong> our sign-in provider (Supabase) keeps your session in your browser&apos;s local storage so you stay signed in.</li>
        <li><strong>Saved history:</strong> your recent project outlooks may be saved in your browser&apos;s local storage on your own device so you can reopen them. You can clear this with the Clear history button or by clearing your browser data.</li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>No advertising or tracking cookies.</li>
        <li>No analytics tools or tracking pixels.</li>
        <li>No social media buttons or embedded videos.</li>
      </ul>

      <h2>Your choices</h2>
      <p>You can delete cookies and site data in your browser settings at any time. If you do, you will be signed out. Details on how we handle your personal data are in our <Link href="/privacy">Privacy Policy</Link>.</p>

      <h2>Contact</h2>
      <p>Questions: {CONTACT_EMAIL}</p>
    </Legal>
  );
}
