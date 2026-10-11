import type { Metadata } from "next";
import Legal from "../legal";
import { CONTACT_EMAIL, LEGAL_UPDATED, SITE_NAME } from "../../lib/site";

export const metadata: Metadata = { title: "Privacy Policy | Scholar Lens", description: "How Scholar Lens collects, uses and protects your information." };

export default function Page() {
  return (
    <Legal title="Privacy Policy" updated={LEGAL_UPDATED}>
      <p>{SITE_NAME} (&quot;we&quot;, &quot;us&quot;) helps people find research papers and understand them. This policy explains what we collect and why.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your email address, and your name or profile picture if you sign in with Google.</li>
        <li><strong>What you submit and save:</strong> the research questions and project descriptions you type, so we can produce results. If you are signed in, your project outlooks and the papers you open with Deep dive are saved to your account until you delete them in My library.</li>
        <li><strong>Usage counts:</strong> how many searches, deep dives and outlooks you run each day, so we can apply daily limits.</li>
        <li><strong>Payment records:</strong> if you buy a paid plan, we keep the order ID, amount, currency and status. Your card, UPI or bank details are handled by our payment provider and are never stored by us.</li>
        <li><strong>Technical data:</strong> basic request data such as IP address, which our hosting provider logs and which we use to prevent abuse.</li>
      </ul>

      <h2>How we use it</h2>
      <p>To run the service, sign you in, apply usage limits, process payments, prevent abuse, fix problems and improve the product. We do not sell your personal information.</p>

      <h2>Who processes it</h2>
      <p>We rely on these providers to operate the service: Supabase (sign-in and database), Vercel (hosting), Google (Google sign-in and the Gemini AI service that writes summaries and outlooks), OpenAlex and Semantic Scholar (scholarly paper data), and Razorpay (payments). The text of your questions and project descriptions is sent to the AI and paper-search providers so they can return results. Each provider handles data under its own terms and privacy policy.</p>

      <h2>Cookies and browser storage</h2>
      <p>We store a sign-in cookie so the site knows who you are. Reports you generate may also be saved in your browser on your own device. Clearing your browser data removes those local copies.</p>

      <h2>How long we keep data</h2>
      <p>We keep your account and usage records while your account is active. You can delete saved outlooks and papers yourself in My library, and you can ask us to delete your account and associated data at any time (see below). We may keep payment records as long as required for accounting and legal reasons.</p>

      <h2>Your choices</h2>
      <p>You can ask to access, correct or delete your information by emailing us. We will respond within a reasonable time.</p>

      <h2>Children</h2>
      <p>The service is not intended for children under 13. If you believe a child has given us personal information, contact us and we will delete it.</p>

      <h2>Security</h2>
      <p>We use reputable providers and access controls to protect your data, but no online service is completely secure.</p>

      <h2>Changes</h2>
      <p>We may update this policy. The date at the top shows the latest version.</p>

      <h2>Contact</h2>
      <p>Questions or requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </Legal>
  );
}
