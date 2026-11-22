import type { Metadata } from "next";
import Link from "next/link";
import Legal from "../legal";
import { CONTACT_EMAIL, LEGAL_UPDATED, SITE_NAME } from "../../lib/site";
export const metadata: Metadata = { title: "Delete your account | Scholar Lens", description: "How to delete your Scholar Lens account and data.", alternates: { canonical: "/delete-account" } };
export default function Page() {
  return (
    <Legal title="Delete your account" updated={LEGAL_UPDATED}>
      <p>You can delete your {SITE_NAME} account and the data saved in it at any time.</p>
      <h2>Delete it yourself</h2>
      <ol>
        <li>Sign in to {SITE_NAME}.</li>
        <li>Open the account menu at the top of the page.</li>
        <li>Choose <strong>Delete my account</strong> and confirm.</li>
      </ol>
      <p>This removes your account, saved outlooks, saved papers, share links, usage counts, consent record and newsletter address. It cannot be undone. Copies held in our database provider&apos;s backups can take up to 30 days to clear.</p>
      <h2>Ask us to do it</h2>
      <p>If you cannot sign in, email {CONTACT_EMAIL} from the address on your account and we will delete it. We reply within 30 days.</p>
      <p>See also our <Link href="/privacy">Privacy Policy</Link>.</p>
    </Legal>
  );
}
