import type { Metadata } from "next";
import Link from "next/link";
import Legal from "../legal";
import { CONTACT_EMAIL, LEGAL_UPDATED, SITE_NAME } from "../../lib/site";

export const metadata: Metadata = { title: "Terms of Service | Scholar Lens", description: "The terms for using Scholar Lens." };

export default function Page() {
  return (
    <Legal title="Terms of Service" updated={LEGAL_UPDATED}>
      <p>By using {SITE_NAME} you agree to these terms. If you do not agree, please do not use the service.</p>

      <h2>The service</h2>
      <p>{SITE_NAME} lets you search scholarly papers, read AI-generated deep dives of individual papers, and generate AI-written project outlooks based on published research. It is delivered online and nothing is shipped.</p>

      <h2>Who can use it</h2>
      <p>You must be at least 13 years old. To buy a paid plan you must be 18 or older, or have a parent or guardian&apos;s permission.</p>

      <h2>Your account</h2>
      <p>You are responsible for activity on your account. Provide a real email address and keep your sign-in secure.</p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not misuse the service, attack it, or try to get around daily limits.</li>
        <li>Do not use bots or automated tools to collect results in bulk, or resell the service without our permission.</li>
        <li>Do not submit unlawful content.</li>
      </ul>

      <h2>Free use and paid plans</h2>
      <p>Free accounts have daily limits. Paid plans, when available, give higher limits for the period stated at checkout. Prices are shown at checkout and may change for future purchases. See our <Link href="/refund">Refund and Cancellation Policy</Link>.</p>

      <h2>AI results and research content</h2>
      <p>Results are produced with AI from paper abstracts and public data, not from full texts. AI can make mistakes, and publication counts show research activity, not real-world or market results. Outlooks and summaries are for information only. They are not financial, medical, legal or other professional advice, and you should check original sources and consult a qualified professional before making decisions.</p>

      <h2>Third-party content</h2>
      <p>Papers and metadata belong to their authors and publishers and come from third-party sources. We link to them but do not own them.</p>

      <h2>Availability</h2>
      <p>We try to keep the service running but do not guarantee it will always be available or error-free. We may change or stop features.</p>

      <h2>Limitation of liability</h2>
      <p>The service is provided &quot;as is&quot;. To the extent allowed by law, we are not liable for indirect or consequential losses, or for decisions you make based on the results. Our total liability for any claim is limited to the amount you paid us in the 3 months before the claim.</p>

      <h2>Ending your access</h2>
      <p>You may stop using the service at any time. We may suspend accounts that break these terms.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India.</p>

      <h2>Contact</h2>
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </Legal>
  );
}
